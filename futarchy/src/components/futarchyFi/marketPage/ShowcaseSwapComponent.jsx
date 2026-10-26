import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { STEPS_CONFIG } from './constants/swapSteps';
import { ethers } from 'ethers';
import { useMetaMask } from '../../../hooks/useMetaMask';
import {
  CONDITIONAL_TOKENS_ADDRESS,
  WRAPPER_SERVICE_ADDRESS,
  SUSHISWAP_V2_ROUTER,
  VAULT_RELAYER_ADDRESS,
  COW_SETTLEMENT_ADDRESS,
  FUTARCHY_ROUTER_ADDRESS,
  DEFAULT_BASE_CURRENCY_TOKEN_ADDRESS,
  DEFAULT_BASE_COMPANY_TOKEN_ADDRESS,
  REQUIRED_CHAIN_ID,
  CONDITIONAL_TOKENS_ABI,
  WRAPPER_SERVICE_ABI,
  SUSHISWAP_ROUTER_ABI,
  ERC20_ABI,
  SPLIT_CONFIG,
  DEFAULT_BASE_TOKENS_CONFIG,
  MERGE_CONFIG,
  YES_TOKEN_ADDRESS,
  NO_TOKEN_ADDRESS,
  COMPANY_YES_TOKEN,
  COMPANY_NO_TOKEN,
  ERC1155_ABI,
  MARKET_ADDRESS,
  WXDAI_ADDRESS
} from './constants/contracts';
import { formatBalance, formatPercentage } from '../../../utils/formatters';
import { useCurrency } from '../../../contexts/CurrencyContext';
import { useContractConfig } from '../../../hooks/useContractConfig';
import { formatTokenAmount, formatWith } from '../../../utils/precisionFormatter';
import { getUniswapV3QuoteWithPriceImpact, getPoolSqrtPrice, sqrtPriceX96ToPrice } from '../../../utils/uniswapSdk';
import { usePublicClient, useChainId } from 'wagmi';
import { describeQuoteError } from '../../../utils/txErrors';
import { executionPriceFor, exceedsAvailable } from '../../../utils/swapQuoteMath';
import { quoteSeerSwap } from '../../../utils/seerSwap';
import { formatUnits } from 'viem';
import { resolveMarketStatus } from '../../../utils/proposalLifecycle';

const QUICK_UNITS = [1, 5, 10];
const QUICK_PERCENTS = [1, 5, 10];

// Opens only from the native-swap action — load it on demand.

// Opens only on user action, and it is one of the heaviest components in
// the market bundle — load it on demand.
const ConfirmSwapModal = dynamic(() => import('./ConfirmSwapModal'), { ssr: false });


// Configuration for this showcase implementation
const SHOWCASE_CHECK_SELL_COLLATERAL = true;

// FEATURE FLAG: Use new Futarchy Quote Helper?
const USING_FUTARCHY_QUOTER = true;

// Add Futarchy Router ABI
const FUTARCHY_ROUTER_ABI = [
  {
    "inputs": [
      {
        "internalType": "contract FutarchyProposal",
        "name": "proposal",
        "type": "address"
      },
      {
        "internalType": "contract IERC20",
        "name": "collateralToken",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "splitPosition",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "contract FutarchyProposal",
        "name": "proposal",
        "type": "address"
      },
      {
        "internalType": "contract IERC20",
        "name": "collateralToken",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "mergePositions",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const ShowcaseSwapComponent = ({ positions, prices, walletBalances, isLoadingBalances, account, isConnected, onConnectWallet, proposalId, marketHasClosed, refetchBalances }) => {
  // Use contract config for dynamic token symbols
  const { config } = useContractConfig(proposalId);

  // Helper functions for dynamic token symbols
  const getCurrencySymbol = () => config?.BASE_TOKENS_CONFIG?.currency?.symbol || DEFAULT_BASE_TOKENS_CONFIG?.currency?.symbol || 'CURRENCY';
  const getCompanySymbol = () => config?.BASE_TOKENS_CONFIG?.company?.symbol || DEFAULT_BASE_TOKENS_CONFIG?.company?.symbol || 'COMPANY';

  // Feature flag for redirecting to CoW Swap instead of native conversion
  const [redirectToCOW, setRedirectToCOW] = useState(false); // Default false for now

  const [amount, setAmount] = useState('1');
  const [amountRawWei, setAmountRawWei] = useState(null); // Raw wei value to avoid precision loss
  const [selectedOutcome, setSelectedOutcome] = useState('approved');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState('Buy'); // 'Buy' or 'Sell'
  const { selectedCurrency } = useCurrency();
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(null);
  const [currentSubstep, setCurrentSubstep] = useState({ step: 1, substep: 0 });
  const [deactivateTimeout, setDeactivateTimeout] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [error, setError] = useState(null);
  const [processingStep, setProcessingStep] = useState(null);
  // Use wallet balances passed from parent component
  const balances = walletBalances || {
    sdaiBalance: '0',
    wxdaiBalance: '0',
    nativeBalance: '0'
  };
  const [confirmModalData, setConfirmModalData] = useState(null);
  // Bumped when a trade may have moved the pool, so the preview is quoted
  // again at once rather than on the next change of the amount.
  const [quoteRefreshKey, setQuoteRefreshKey] = useState(0);

  // QuoterV2 live preview state
  const [quoterPreview, setQuoterPreview] = useState({
    isLoading: false,
    amountOut: null,
    currentPrice: null,
    executionPrice: null,
    error: null
  });
  const [showPriceInfo, setShowPriceInfo] = useState(false);
  // Id of the latest quote request; a response for an older one is dropped
  const quoteRequestIdRef = useRef(0);
  const [tradeAnywayAcknowledged, setTradeAnywayAcknowledged] = useState(false);
  const [swapRotation, setSwapRotation] = useState(0);
  const publicClient = usePublicClient();
  const walletChainId = useChainId();

  // Use the market's chain (from config/registry) for quoting, not the wallet's chain.
  // The wallet may be on Ethereum while viewing a Gnosis market.
  const chainId = config?.chainId || walletChainId;

  const {
    signer,
    provider,
    connect,
    checkAndSwitchChain,
    checkAndApproveToken
  } = useMetaMask();

  // Calculate percentages for the progress bar
  const approvalAmount = 298.7;
  const rejectionAmount = 201.3;
  const total = approvalAmount + rejectionAmount;
  const approvalPercentage = (approvalAmount / total) * 100;

  const outcomeOptions = {
    approved: {
      text: 'If Approved',
      bgColor: 'bg-futarchyTeal3',
      iconColor: 'text-futarchyTeal9',
      borderColor: 'border-futarchyTeal6'
    },
    reproved: {
      text: 'If Reproved',
      bgColor: 'bg-futarchyOrange3',
      iconColor: 'text-futarchyOrange9',
      borderColor: 'border-futarchyOrange6'
    }
  };

  // Handler for outcome selection (Event Occurs/Doesn't Occur)
  const handleOutcomeSelect = useCallback((outcome) => {
    setSelectedOutcome(outcome);
    setIsDropdownOpen(false);
    console.log('Outcome selected:', outcome === 'approved' ? 'Event Occurs Outcome' : 'Event Doesn\'t Occur Outcome');
  }, []);

  // Handler for amount input
  const handleAmountChange = useCallback((e) => {
    const newAmount = e.target.value;
    setAmount(newAmount);
    setAmountRawWei(null); // Clear raw wei when user types manually (was set by max click)
    setError(null); // Clear any errors when amount changes
    console.log('Amount input updated to:', `$${newAmount} USDC`);
  }, []);

  // Debounced QuoterV2/Swapr SDK preview - for Ethereum (chainId === 1) and Gnosis (chainId === 100)
  useEffect(() => {
    // Wait for the market config: before it loads chainId is the wallet's
    // (mainnet by default), which sent Gnosis markets to Uniswap lookups.
    if (!config?.chainId) return;

    // Only run on Ethereum mainnet or Gnosis Chain
    if (chainId !== 1 && chainId !== 100) {
      setQuoterPreview({ isLoading: false, amountOut: null, error: null });
      return;
    }

    // Validate amount
    if (!amount || parseFloat(amount) <= 0) {
      setQuoterPreview({ isLoading: false, amountOut: null, error: null });
      return;
    }

    // Set loading state immediately (only if we are going to fetch)
    setQuoterPreview(prev => ({ ...prev, isLoading: true }));

    let isActive = true;
    const requestId = ++quoteRequestIdRef.current;
    const isCurrent = () => isActive && requestId === quoteRequestIdRef.current;

    // Debounce: wait 500ms after user stops typing
    const timer = setTimeout(async () => {
      // Resolve tokens and provider outside try so catch can use them for fallback
      const baseTokenConfig = config?.BASE_TOKENS_CONFIG || DEFAULT_BASE_TOKENS_CONFIG;
      const mergeConfig = config?.MERGE_CONFIG || MERGE_CONFIG;

      let tokenIn, tokenOut;
      if (selectedAction === 'Buy') {
        // Buy: currency -> company
        tokenIn = selectedOutcome === 'approved'
          ? mergeConfig.currencyPositions.yes.wrap.wrappedCollateralTokenAddress
          : mergeConfig.currencyPositions.no.wrap.wrappedCollateralTokenAddress;
        tokenOut = selectedOutcome === 'approved'
          ? mergeConfig.companyPositions.yes.wrap.wrappedCollateralTokenAddress
          : mergeConfig.companyPositions.no.wrap.wrappedCollateralTokenAddress;
      } else {
        // Sell: company -> currency
        tokenIn = selectedOutcome === 'approved'
          ? mergeConfig.companyPositions.yes.wrap.wrappedCollateralTokenAddress
          : mergeConfig.companyPositions.no.wrap.wrappedCollateralTokenAddress;
        tokenOut = selectedOutcome === 'approved'
          ? mergeConfig.currencyPositions.yes.wrap.wrappedCollateralTokenAddress
          : mergeConfig.currencyPositions.no.wrap.wrappedCollateralTokenAddress;
      }

      try {
        console.log('[QUOTER SHOWCASE] Fetching quote for amount:', amount);

        // The swap executes through @seer-pm/sdk, so its quote supplies the
        // amounts; the pool quote below still supplies current price, price
        // after and impact. Both run in parallel.
        const seerQuote = (chainId === 1 || chainId === 100)
          ? quoteSeerSwap({
            chainId,
            account,
            tokenIn,
            tokenOut,
            amountInRaw: amountRawWei || undefined,
            amount,
            slippageBps: 50
          }).then((trade) => ({ trade }), (error) => ({ error }))
          : null;

        // Use best available RPC for the current chain
        const { getBestRpcProvider, getBestRpc } = await import('../../../utils/getBestRpc');
        const ethersProvider = await getBestRpcProvider(chainId);

        let quoteResult, currentPrice, executionPrice;

        if (chainId === 100) {
          // Gnosis Chain Logic
          if (USING_FUTARCHY_QUOTER) {
            console.log('[QUOTER SHOWCASE] Using FutarchyQuoteHelper (New Logic)');
            const { getSwapQuote } = await import('../../../utils/FutarchyQuoteHelper');

            // Prepare params
            // 1. Proposal Address should be proposalId (if it's an address) or retrieved from config?
            // Usually proposalId IS the address. Let's verify. 
            // Looking at usage: const { config } = useContractConfig(proposalId);

            // 2. isYesPool -> Selected Outcome
            const isYesPool = selectedOutcome === 'approved';

            // 3. isInputCompanyToken -> 'Buy' means Currency->Company? 
            // If Buy: Input is Currency. Company is Output.
            // If Sell: Input is Company. Currency is Output.
            // Helper param: isInputCompanyToken
            const isInputCompanyToken = selectedAction === 'Sell';

            const quoteParams = {
              proposal: proposalId,
              amount: amount,
              isYesPool: isYesPool,
              isInputCompanyToken: isInputCompanyToken,
              slippagePercentage: 0.005 // 0.5% default slippage
            };

            try {
              const quote = await getSwapQuote(quoteParams, ethersProvider);
              if (quote?.partialFill) {
                // The pool stops at its price limit before taking the whole amount
                const partialError = new Error('Pool can only fill part of this amount');
                partialError.partialFill = true;
                throw partialError;
              }
              if (quote) {
                quoteResult = {
                  amountOut: quote.expectedReceive, // String already
                  amountOutFormatted: quote.expectedReceive,
                  minimumReceived: quote.minReceive,
                  priceAfter: quote.priceAfter,
                  currentPrice: quote.currentPoolPrice,
                  amountOutRaw: quote.raw.amountOut // PRESERVE RAW WEI VALUE
                };

                // Helper already handles inversion logic!
                currentPrice = parseFloat(quote.currentPoolPrice);
                executionPrice = parseFloat(quote.executionPrice);

                console.log('[QUOTER SHOWCASE] FutarchyQuoteHelper Result:', quote);
              } else {
                throw new Error('No quote returned');
              }
            } catch (err) {
              console.error('[QUOTER SHOWCASE] Helper failed, falling back to legacy?', err);
              throw err;
            }

          } else {
            // Legacy Gnosis Chain: Use direct Algebra Quoter
            console.log('[QUOTER SHOWCASE] Using direct Algebra Quoter for Gnosis Chain (Legacy)');
            const { getAlgebraQuoteWithSlippage } = await import('../../../utils/algebraQuoter');

            // Get pool address based on outcome
            const poolConfigYes = config?.POOL_CONFIG_YES || POOL_CONFIG_YES;
            const poolConfigNo = config?.POOL_CONFIG_NO || POOL_CONFIG_NO;
            const poolConfig = selectedOutcome === 'approved' ? poolConfigYes : poolConfigNo;
            const poolAddress = poolConfig?.address;

            if (!poolAddress) {
              throw new Error('Pool address not found for selected outcome');
            }

            // Build merge config from metadata for proper token classification
            const metadataMergeConfig = config?.metadata ? {
              companyPositions: {
                yes: { wrap: { wrappedCollateralTokenAddress: config.metadata.companyTokens?.yes?.wrappedCollateralTokenAddress } },
                no: { wrap: { wrappedCollateralTokenAddress: config.metadata.companyTokens?.no?.wrappedCollateralTokenAddress } }
              },
              currencyPositions: {
                yes: { wrap: { wrappedCollateralTokenAddress: config.metadata.currencyTokens?.yes?.wrappedCollateralTokenAddress } },
                no: { wrap: { wrappedCollateralTokenAddress: config.metadata.currencyTokens?.no?.wrappedCollateralTokenAddress } }
              }
            } : null;

            const metadataBaseTokenConfig = config?.metadata ? {
              currency: { address: config.metadata.currencyTokens?.base?.wrappedCollateralTokenAddress },
              company: { address: config.metadata.companyTokens?.base?.wrappedCollateralTokenAddress }
            } : null;

            quoteResult = await getAlgebraQuoteWithSlippage({
              tokenIn,
              tokenOut,
              amountIn: amount,
              poolAddress,
              provider: ethersProvider,
              slippageBps: 50, // 0.5% slippage
              mergeConfig: metadataMergeConfig,
              baseTokenConfig: metadataBaseTokenConfig
            });

            currentPrice = quoteResult.currentPrice;
            executionPrice = parseFloat(quoteResult.displayPrice || quoteResult.executionPrice);

            console.log('[QUOTER SHOWCASE] Algebra direct quote result:', quoteResult);
          }
        } else {
          // Ethereum mainnet: Use Uniswap QuoterV2
          console.log('[QUOTER SHOWCASE] Using Uniswap QuoterV2 for Ethereum');

          // Always fetch pool current price first (needed even if quote fails)
          let poolData;
          try {
            poolData = await getPoolSqrtPrice(tokenIn, tokenOut, 500, ethersProvider, 1);
            currentPrice = sqrtPriceX96ToPrice(poolData.sqrtPriceX96);
          } catch (poolErr) {
            console.warn('[QUOTER SHOWCASE] Could not get pool price:', poolErr.message);
          }

          quoteResult = await getUniswapV3QuoteWithPriceImpact({
            tokenIn,
            tokenOut,
            amountIn: amount,
            fee: 500,
            provider: ethersProvider,
            chainId: 1,
            slippageBps: 50
          });

          console.log('[QUOTER SHOWCASE] Quote result:', quoteResult);

          // If pool price wasn't fetched above (different fee tier), try with the quoter's fee tier
          if (!poolData && quoteResult.feeTier !== 500) {
            poolData = await getPoolSqrtPrice(tokenIn, tokenOut, quoteResult.feeTier, ethersProvider, 1);
            currentPrice = sqrtPriceX96ToPrice(poolData.sqrtPriceX96);
          }

          // Average price actually paid, already in currency per company
          executionPrice = executionPriceFor({
            amountIn: amount,
            amountOut: quoteResult.amountOutFormatted,
            isBuy: selectedAction === 'Buy'
          });
          // Pool spot price after the swap (token1/token0; inverted below)
          quoteResult.priceAfter = sqrtPriceX96ToPrice(quoteResult.sqrtPriceX96After);
        }

        // Determine if we need to invert based on action (Buy/Sell)
        // Goal: Always show prices as "currency per company"
        // Swapr SDK already returns displayPrice in the correct direction
        if (chainId === 1) {
          // Uniswap: Simplify using action
          const isBuy = selectedAction === 'Buy';

          // Pool prices from sqrtPriceX96 are ALWAYS token1/token0
          // For Buy: tokenIn=currency, tokenOut=company
          //   If tokenIn < tokenOut: token0=currency, token1=company → pool=company/currency → INVERT
          //   If tokenOut < tokenIn: token0=company, token1=currency → pool=currency/company → DON'T INVERT
          // For Sell: tokenIn=company, tokenOut=currency
          //   If tokenOut < tokenIn: token0=currency, token1=company → pool=company/currency → INVERT
          //   If tokenIn < tokenOut: token0=company, token1=currency → pool=currency/company → DON'T INVERT
          const shouldInvert = isBuy
            ? (tokenIn.toLowerCase() < tokenOut.toLowerCase())
            : (tokenOut.toLowerCase() < tokenIn.toLowerCase());

          if (shouldInvert) {
            currentPrice = 1 / currentPrice;
            quoteResult.priceAfter = 1 / quoteResult.priceAfter;
          }

          console.log('[QUOTER SHOWCASE] Uniswap Prices:', {
            action: selectedAction,
            tokenIn,
            tokenOut,
            currentPrice,
            executionPrice,
            shouldInvert,
            note: 'Simplified: Buy with tokenIn<tokenOut → invert, Sell with tokenOut<tokenIn → invert'
          });
        } else {
          // For Gnosis with FutarchyHelper, prices are already inverted correctly.
          // For Legacy Gnosis, they are also handled.
          // So we don't need to do anything here except log.
          console.log('[QUOTER SHOWCASE] Gnosis Quote Result:', {
            currentPrice,
            executionPrice,
            method: USING_FUTARCHY_QUOTER ? 'Helper' : 'Legacy'
          });
        }

        if (seerQuote) {
          const { trade, error: seerError } = await seerQuote;
          if (seerError) throw seerError;
          const amountOutFormatted = formatUnits(trade.amountOut, trade.tokenOut.decimals);
          quoteResult = {
            ...quoteResult,
            amountOut: amountOutFormatted,
            amountOutFormatted,
            amountOutRaw: trade.amountOut.toString(),
            minimumReceived: formatUnits(trade.minimumAmountOut(), trade.tokenOut.decimals),
            decimalsOut: trade.tokenOut.decimals,
            swapSpender: trade.approveAddress
          };
          executionPrice = executionPriceFor({ amountIn: amount, amountOut: amountOutFormatted, isBuy: selectedAction === 'Buy' });
        }

        if (isCurrent()) {
          const afterPrice = quoteResult.priceAfter ?? executionPrice;
          const priceImpactPct = Number.isFinite(Number(quoteResult.priceImpactPct ?? quoteResult.priceImpact))
            ? Math.abs(Number(quoteResult.priceImpactPct ?? quoteResult.priceImpact))
            : currentPrice && executionPrice
              ? Math.abs((currentPrice - executionPrice) / currentPrice) * 100
              : null;

          setQuoterPreview({
            isLoading: false,
            quotedAmountIn: amount,
            amountOut: quoteResult.amountOutFormatted || quoteResult.amountOut,
            currentPrice,
            executionPrice,
            priceImpact: quoteResult.priceImpact,
            priceImpactPct,
            slippage: quoteResult.slippage,
            priceAfter: afterPrice,
            minimumReceived: quoteResult.minimumReceived,
            amountOutRaw: quoteResult.amountOutRaw,
            decimalsOut: quoteResult.decimalsOut || 18,
            swapSpender: quoteResult.swapSpender,
            chainId: chainId,
            insufficientLiquidity: false,
            error: null
          });
        }
      } catch (error) {
        if (isCurrent()) {
          console.error('[QUOTER SHOWCASE] Error:', error);
          // A partial fill or a reverted simulation means the pool cannot take
          // this amount; RPC and other failures are reported as they are.
          const { kind, message } = error?.partialFill
            ? { kind: 'partial', message: 'Pool can only fill part of this amount' }
            : describeQuoteError(error);

          // Even when the quoter fails (e.g. no liquidity in sell direction),
          // try to show the current pool price so More Info still works
          let fallbackPrice = null;
          try {
            const { getBestRpcProvider } = await import('../../../utils/getBestRpc');
            const ethersProvider = await getBestRpcProvider(chainId);
            if (chainId === 1) {
              const poolData = await getPoolSqrtPrice(tokenIn, tokenOut, 500, ethersProvider, 1);
              fallbackPrice = sqrtPriceX96ToPrice(poolData.sqrtPriceX96);
              // Apply same inversion logic as the main path
              const isBuy = selectedAction === 'Buy';
              const shouldInvert = isBuy
                ? (tokenIn.toLowerCase() < tokenOut.toLowerCase())
                : (tokenOut.toLowerCase() < tokenIn.toLowerCase());
              if (shouldInvert) fallbackPrice = 1 / fallbackPrice;
            } else if (chainId === 100) {
              // Gnosis: try the Algebra pool
              const { getAlgebraQuoteWithSlippage } = await import('../../../utils/algebraQuoter');
              // Can't get pool price without a full quote on Algebra, skip
            }
          } catch (poolErr) {
            console.warn('[QUOTER SHOWCASE] Could not get fallback pool price:', poolErr.message);
          }

          if (!isCurrent()) return; // a newer quote started while the fallback price loaded

          setQuoterPreview({
            isLoading: false,
            amountOut: null,
            currentPrice: fallbackPrice,
            chainId: chainId,
            insufficientLiquidity: kind === 'partial' || kind === 'reverted',
            error: message
          });
        }
      }
    }, 500); // 500ms debounce

    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [amount, selectedAction, selectedOutcome, chainId, config, quoteRefreshKey]);

  useEffect(() => {
    setTradeAnywayAcknowledged(false);
  }, [amount, selectedAction, selectedOutcome]);

  // Handler for buy/sell selection
  const handleActionSelect = useCallback((action) => {
    setSelectedAction(action);
    console.log('Action selected:', action === 'Buy' ? 'Buy' : 'Sell');
  }, []);

  // Handle max amount click without formatting
  const handleMaxClick = useCallback(() => {
    try {
      let totalAvailable;

      if (selectedAction === 'Buy') {
        // For Buy action, determine max based on selected currency mode
        if (selectedCurrency === getCurrencySymbol()) {
          // Currency mode: Sum position tokens + currency balance
          const outcomeBalance = selectedOutcome === 'approved'
            ? (positions?.currencyYes?.total || '0')
            : (positions?.currencyNo?.total || '0');
          const baseBalance = balances?.currencyBalance || balances?.sdaiBalance || '0';

          const outcomeBN = ethers.utils.parseUnits(outcomeBalance, 18);
          const baseBN = ethers.utils.parseUnits(baseBalance, 18);
          const totalBN = outcomeBN.add(baseBN);
          totalAvailable = ethers.utils.formatUnits(totalBN, 18);
        } else if (selectedCurrency === 'WXDAI') {
          if (redirectToCOW) {
            // When redirectToCOW is true: Show SDAI + position tokens (like currency mode)
            const outcomeBalance = selectedOutcome === 'approved'
              ? (positions?.currencyYes?.total || '0')
              : (positions?.currencyNo?.total || '0');
            const baseBalance = balances?.sdaiBalance || '0';

            const outcomeBN = ethers.utils.parseUnits(outcomeBalance, 18);
            const baseBN = ethers.utils.parseUnits(baseBalance, 18);
            const totalBN = outcomeBN.add(baseBN);
            totalAvailable = ethers.utils.formatUnits(totalBN, 18);
          } else {
            // Original behavior: Use ONLY native xDAI balance (no position tokens)
            totalAvailable = balances?.nativeBalance || '0';
          }
        } else {
          // Fallback mode: Sum position tokens + WXDAI balance
          const outcomeBalance = selectedOutcome === 'approved'
            ? (positions?.currencyYes?.total || '0')
            : (positions?.currencyNo?.total || '0');
          const baseBalance = positions?.wxdai || '0';

          const outcomeBN = ethers.utils.parseUnits(outcomeBalance, 18);
          const baseBN = ethers.utils.parseUnits(baseBalance, 18);
          const totalBN = outcomeBN.add(baseBN);
          totalAvailable = ethers.utils.formatUnits(totalBN, 18);
        }
      } else { // Sell
        // For Sell action: Always sum position tokens + base token balance
        const outcomeBalance = selectedOutcome === 'approved'
          ? (positions?.companyYes?.total || '0')
          : (positions?.companyNo?.total || '0');
        const baseBalance = positions?.faot || '0';

        const outcomeBN = ethers.utils.parseUnits(outcomeBalance, 18);
        const baseBN = ethers.utils.parseUnits(baseBalance, 18);
        const totalBN = outcomeBN.add(baseBN);
        totalAvailable = ethers.utils.formatUnits(totalBN, 18);
      }

      // Set amount to the calculated total AND store raw wei value
      setAmount(totalAvailable);
      // Store raw wei value to avoid precision loss when re-parsing
      // We need to calculate the raw wei value here
      let rawWeiValue = null;
      if (selectedAction === 'Buy') {
        if (selectedCurrency === getCurrencySymbol()) {
          const outcomeBalance = selectedOutcome === 'approved'
            ? (positions?.currencyYes?.total || '0')
            : (positions?.currencyNo?.total || '0');
          const baseBalance = balances?.currencyBalance || balances?.sdaiBalance || '0';
          const outcomeBN = ethers.utils.parseUnits(outcomeBalance, 18);
          const baseBN = ethers.utils.parseUnits(baseBalance, 18);
          rawWeiValue = outcomeBN.add(baseBN).toString();
        } else if (selectedCurrency === 'WXDAI') {
          if (redirectToCOW) {
            const outcomeBalance = selectedOutcome === 'approved'
              ? (positions?.currencyYes?.total || '0')
              : (positions?.currencyNo?.total || '0');
            const baseBalance = balances?.sdaiBalance || '0';
            const outcomeBN = ethers.utils.parseUnits(outcomeBalance, 18);
            const baseBN = ethers.utils.parseUnits(baseBalance, 18);
            rawWeiValue = outcomeBN.add(baseBN).toString();
          } else {
            rawWeiValue = ethers.utils.parseUnits(balances?.nativeBalance || '0', 18).toString();
          }
        } else {
          const outcomeBalance = selectedOutcome === 'approved'
            ? (positions?.currencyYes?.total || '0')
            : (positions?.currencyNo?.total || '0');
          const baseBalance = positions?.wxdai || '0';
          const outcomeBN = ethers.utils.parseUnits(outcomeBalance, 18);
          const baseBN = ethers.utils.parseUnits(baseBalance, 18);
          rawWeiValue = outcomeBN.add(baseBN).toString();
        }
      } else {
        const outcomeBalance = selectedOutcome === 'approved'
          ? (positions?.companyYes?.total || '0')
          : (positions?.companyNo?.total || '0');
        const baseBalance = positions?.faot || '0';
        const outcomeBN = ethers.utils.parseUnits(outcomeBalance, 18);
        const baseBN = ethers.utils.parseUnits(baseBalance, 18);
        rawWeiValue = outcomeBN.add(baseBN).toString();
      }
      setAmountRawWei(rawWeiValue);
    } catch (error) {
      console.error('Error calculating max amount:', error);
      // Fallback to just outcome balance
      const fallbackBalance = selectedAction === 'Buy'
        ? (selectedOutcome === 'approved'
          ? (positions?.currencyYes?.total || '0')
          : (positions?.currencyNo?.total || '0'))
        : (selectedOutcome === 'approved'
          ? (positions?.companyYes?.total || '0')
          : (positions?.companyNo?.total || '0'));
      setAmount(fallbackBalance);
      // Also set raw wei for fallback
      try {
        setAmountRawWei(ethers.utils.parseUnits(fallbackBalance, 18).toString());
      } catch (e) {
        setAmountRawWei(null);
      }
    }
  }, [selectedAction, selectedOutcome, selectedCurrency, positions, balances, redirectToCOW, getCurrencySymbol]);

  // Memoized transaction data object
  const transactionData = useMemo(() => ({
    outcome: selectedOutcome === 'approved' ? 'Event Will Occur' : 'Event Won\'t Occur',
    amount: `${amount} ${getCurrencySymbol()}`,
    action: selectedAction === 'Buy' ? 'Buy' : 'Sell',
    timestamp: new Date().toISOString()
  }), [selectedOutcome, amount, selectedAction, getCurrencySymbol]);

  const handleConfirmClick = () => {
    if (parseFloat(amount) <= 0 || isNaN(parseFloat(amount))) {
      console.error("Invalid amount entered");
      return;
    }
    if (insufficientBalance) {
      console.error('Amount exceeds the available balance');
      return;
    }
    if ((chainId === 1 || chainId === 100) && (quoterPreview.isLoading || quoterPreview.quotedAmountIn !== amount || !quoterPreview.amountOut)) {
      console.error('A current on-chain pool quote is required');
      return;
    }

    console.log("Preparing data for direct ConfirmSwapModal opening");

    // Calculate expected receive amount based on current price
    // Use the new Algebra pool prices for accurate calculation
    let expectedReceiveAmount = '0';
    let receiveToken = '';
    const inputAmount = parseFloat(amount);


    // Use the appropriate price based on the selected outcome
    const currentPrice = selectedOutcome === 'approved' ? prices?.yesPrice : prices?.noPrice;

    // If we have a valid quote preview from the new helper, use it!
    if (USING_FUTARCHY_QUOTER && quoterPreview?.amountOut && !quoterPreview.error) {
      console.log('[Confirm] Using cached quote from FutarchyQuoteHelper');
      expectedReceiveAmount = quoterPreview.amountOut;

      // Both sides of the swap are conditional tokens: a buy pays out
      // YES_/NO_ company tokens and a sell YES_/NO_ currency tokens.
      const outcomePrefix = selectedOutcome === 'approved' ? 'YES_' : 'NO_';
      receiveToken = outcomePrefix + (selectedAction === 'Buy' ? getCompanySymbol() : getCurrencySymbol());
    } else if (chainId !== 1 && chainId !== 100 && currentPrice && currentPrice > 0) {
      // Fallback to legacy calc — spot price estimate with conservative fee deduction
      const APPROX_POOL_FEE = 0.01; // 1% conservative estimate for pool fees
      if (selectedAction === 'Buy') {
        // Buying company token with currency
        const rawExpected = (inputAmount / currentPrice) * (1 - APPROX_POOL_FEE);
        expectedReceiveAmount = formatWith(rawExpected, 'balance');
        receiveToken = (selectedOutcome === 'approved' ? 'YES_' : 'NO_') + getCompanySymbol();
      } else {
        // Selling company token for currency
        const rawExpected = (inputAmount * currentPrice) * (1 - APPROX_POOL_FEE);
        expectedReceiveAmount = formatWith(rawExpected, 'balance');
        receiveToken = getCurrencySymbol();
      }
    }
    console.log("[SHOWCASE] Confirm Data:", {
      USING_FUTARCHY_QUOTER,
      quoterPreview,
      priceAfter: quoterPreview?.priceAfter,
    });

    const directConfirmData = {
      outcome: selectedOutcome === 'approved' ? 'Event Will Occur' : 'Event Won\'t Occur',
      amount: selectedAction === 'Sell'
        ? `${amount} ${getCompanySymbol()}`
        : `${amount} ${getCurrencySymbol()}`,
      action: selectedAction, // This correctly passes 'Buy' or 'Sell'
      timestamp: new Date().toISOString(),
      expectedReceiveAmount,
      receiveToken,
      inputAmountRaw: amount,
      amountInRaw: amountRawWei, // Raw wei value to avoid precision loss (null if user typed manually)
      selectedOutcome,
      // Pass detailed quote data if available
      priceAfter: (USING_FUTARCHY_QUOTER && quoterPreview?.priceAfter) ? quoterPreview.priceAfter : null,
      minimumReceived: (USING_FUTARCHY_QUOTER && quoterPreview?.minimumReceived) ? quoterPreview.minimumReceived : null,
      amountOutRaw: (USING_FUTARCHY_QUOTER && quoterPreview?.amountOutRaw) ? quoterPreview.amountOutRaw : null,
      // Price impact of this trade, already included in the quoted output
      priceImpact: quoterPreview?.priceImpactPct ?? null,

      currentPrice: (USING_FUTARCHY_QUOTER && quoterPreview?.currentPrice) ? quoterPreview.currentPrice : null,
      executionPrice: (USING_FUTARCHY_QUOTER && quoterPreview?.executionPrice) ? quoterPreview.executionPrice : null,
      isApproximate: !(USING_FUTARCHY_QUOTER && quoterPreview?.amountOut && !quoterPreview.error),
      insufficientLiquidity: quoterPreview?.insufficientLiquidity || false,
      outputDecimals: quoterPreview?.decimalsOut || 18,
      swapSpender: quoterPreview?.swapSpender,
      tradeAnywayAcknowledged,
    };
    console.log("Opening ConfirmSwapModal directly with data:", directConfirmData);
    setConfirmModalData(directConfirmData);
    setIsConfirmModalOpen(true);
  };

  // Called by ConfirmSwapModal on every successful swap. The modal stays open
  // on its "complete" state (the user closes it); the balances refresh now
  // rather than on the parent's next poll.
  const handleTransactionComplete = () => {
    refetchBalances?.();
    setQuoteRefreshKey((key) => key + 1);
  };

  const handleConfirmModalClose = () => {
    setIsConfirmModalOpen(false);
    // Safe transactions close the modal without a completion callback
    refetchBalances?.();
    setQuoteRefreshKey((key) => key + 1);
  };

  // Add this effect to handle tab visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isProcessing) {
        setCurrentStep(null);
        setIsProcessing(false);
        alert("Transaction cancelled: Tab lost focus. Please try again with this tab active.");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isProcessing]);

  // Balance fetching is now handled by parent component's useBalanceManager

  // "Available" in the panel: wallet collateral plus the conditional tokens
  // already held for the selected side. value is the exact decimal string
  // (null while unknown) — the Confirm button compares the amount with it.
  const computeAvailableBalance = () => {
    if (!account) return { display: '-', value: null };
    if (!positions || isLoadingBalances) return { display: 'Loading...', value: null }; // Show loading when positions or balances are loading

    // Calculate available balance based on selected outcome and action
    let calculatedValueStr, symbol;

    if (selectedAction === 'Buy') {
      // For Buy action, determine balance based on selected currency mode
      if (selectedCurrency === getCurrencySymbol()) {
        // Currency mode: Sum position tokens + currency balance
        const outcomeBalance = selectedOutcome === 'approved'
          ? (positions?.currencyYes?.total || '0')
          : (positions?.currencyNo?.total || '0');
        const baseBalance = balances?.sdaiBalance || '0';
        symbol = getCurrencySymbol();

        try {
          const outcomeBN = ethers.utils.parseUnits(outcomeBalance, 18);
          const baseBN = ethers.utils.parseUnits(baseBalance, 18);
          const totalBN = outcomeBN.add(baseBN);
          calculatedValueStr = ethers.utils.formatUnits(totalBN, 18);
        } catch (calcError) {
          console.error('Error calculating currency balance:', calcError);
          calculatedValueStr = outcomeBalance || '-';
        }
      } else if (selectedCurrency === 'WXDAI') {
        if (redirectToCOW) {
          // When redirectToCOW is true: Show currency + position tokens (like currency mode)
          const outcomeBalance = selectedOutcome === 'approved'
            ? (positions?.currencyYes?.total || '0')
            : (positions?.currencyNo?.total || '0');
          const baseBalance = balances?.sdaiBalance || '0';
          symbol = getCurrencySymbol();

          try {
            const outcomeBN = ethers.utils.parseUnits(outcomeBalance, 18);
            const baseBN = ethers.utils.parseUnits(baseBalance, 18);
            const totalBN = outcomeBN.add(baseBN);
            calculatedValueStr = ethers.utils.formatUnits(totalBN, 18);
          } catch (calcError) {
            console.error('Error calculating WXDAI redirectToCOW balance:', calcError);
            calculatedValueStr = outcomeBalance || '-';
          }
        } else {
          // Original behavior: Show ONLY native xDAI balance (no position tokens)
          calculatedValueStr = balances?.nativeBalance || '0';
          symbol = 'xDAI';
        }
      } else {
        // Fallback mode: Sum position tokens + WXDAI balance
        const outcomeBalance = selectedOutcome === 'approved'
          ? (positions?.currencyYes?.total || '0')
          : (positions?.currencyNo?.total || '0');
        const baseBalance = positions?.wxdai || '0';
        symbol = 'WXDAI';

        try {
          const outcomeBN = ethers.utils.parseUnits(outcomeBalance, 18);
          const baseBN = ethers.utils.parseUnits(baseBalance, 18);
          const totalBN = outcomeBN.add(baseBN);
          calculatedValueStr = ethers.utils.formatUnits(totalBN, 18);
        } catch (calcError) {
          console.error('Error calculating fallback balance:', calcError);
          calculatedValueStr = outcomeBalance || '-';
        }
      }
    } else { // Sell
      // For Sell action: Always sum position tokens + base token balance
      const outcomeBalance = selectedOutcome === 'approved'
        ? (positions?.companyYes?.total || '0')
        : (positions?.companyNo?.total || '0');
      const baseBalance = positions?.faot || '0'; // Company token balance from positions
      symbol = getCompanySymbol();

      try {
        const outcomeBN = ethers.utils.parseUnits(outcomeBalance, 18);
        const baseBN = ethers.utils.parseUnits(baseBalance, 18);
        const totalBN = outcomeBN.add(baseBN);
        calculatedValueStr = ethers.utils.formatUnits(totalBN, 18);
      } catch (calcError) {
        console.error('Error calculating sell balance:', calcError);
        calculatedValueStr = outcomeBalance || '-';
      }
    }

    // If we don't have a valid calculated value, show dash
    if (!calculatedValueStr || calculatedValueStr === '0' || calculatedValueStr === '0.0') {
      return { display: '-', value: calculatedValueStr === '-' ? null : '0' };
    }

    return { display: `${formatWith(parseFloat(calculatedValueStr), 'balance')} ${symbol}`, value: calculatedValueStr };
  };
  const availableBalance = computeAvailableBalance();
  const insufficientBalance = Boolean(account) && availableBalance.value !== null && exceedsAvailable(amount, availableBalance.value);

  const displayedPriceImpact = Number(quoterPreview.priceImpactPct);
  const hasPriceImpact = Number.isFinite(displayedPriceImpact);
  const priceImpactTooHigh = hasPriceImpact && displayedPriceImpact > 15;
  const quoteUnavailable = (chainId === 1 || chainId === 100) && (quoterPreview.quotedAmountIn !== amount || !quoterPreview.amountOut);

  const quoteChain = chainId === 1 || chainId === 100;
  const isYesSide = selectedOutcome === 'approved';
  const paySymbol = selectedAction === 'Buy' ? getCurrencySymbol() : getCompanySymbol();
  const receiveSymbol = selectedAction === 'Buy' ? getCompanySymbol() : getCurrencySymbol();

  const balanceBreakdown = (() => {
    // "Available" = wallet balance + the selected side's conditional
    // tokens. Show both parts so the sum isn't a silent surprise.
    const outcomePrefix = isYesSide ? 'YES' : 'NO';
    let baseBalance = '0';
    let outcomeBalance = '0';
    let symbol;
    let outcomeSymbol;

    if (selectedAction === 'Buy') {
      const currencyOutcome = (isYesSide
        ? positions?.currencyYes?.total
        : positions?.currencyNo?.total) || '0';
      outcomeSymbol = `${outcomePrefix}_${getCurrencySymbol()}`;
      if (selectedCurrency === getCurrencySymbol() || (selectedCurrency === 'WXDAI' && redirectToCOW)) {
        baseBalance = balances?.sdaiBalance || '0';
        outcomeBalance = currencyOutcome;
        symbol = getCurrencySymbol();
      } else if (selectedCurrency === 'WXDAI') {
        baseBalance = balances?.nativeBalance || '0';
        symbol = 'xDAI';
      } else {
        baseBalance = positions?.wxdai || '0';
        outcomeBalance = currencyOutcome;
        symbol = 'WXDAI';
      }
    } else {
      baseBalance = positions?.faot || '0';
      outcomeBalance = (isYesSide
        ? positions?.companyYes?.total
        : positions?.companyNo?.total) || '0';
      symbol = getCompanySymbol();
      outcomeSymbol = `${outcomePrefix}_${getCompanySymbol()}`;
    }

    let breakdownText = null;
    if (account && positions && !isLoadingBalances && parseFloat(outcomeBalance) > 0) {
      breakdownText = `${formatWith(parseFloat(baseBalance), 'balance')} ${symbol} + ${formatWith(parseFloat(outcomeBalance), 'balance')} ${outcomeSymbol}`;
    }
    return { breakdownText, symbol, outcomeSymbol };
  })();

  const availableWei = (() => {
    try {
      return availableBalance.value ? ethers.utils.parseUnits(availableBalance.value, 18) : null;
    } catch {
      return null;
    }
  })();
  const canUseBalance = Boolean(account) && Boolean(availableWei) && availableWei.gt(0);

  const setAmountFromWei = (wei) => {
    const next = wei.lt(0) ? ethers.constants.Zero : wei;
    setAmount(ethers.utils.formatUnits(next, 18).replace(/\.0$/, ''));
    setAmountRawWei(null);
    setError(null);
  };

  const addToAmount = (deltaWei) => {
    let current = ethers.constants.Zero;
    try {
      current = ethers.utils.parseUnits(amount || '0', 18);
    } catch {
      current = ethers.constants.Zero;
    }
    const next = current.add(deltaWei);
    setAmountFromWei(availableWei && next.gt(availableWei) ? availableWei : next);
  };

  const receiveValue = (() => {
    if (quoteChain && quoterPreview.isLoading) {
      return {
        empty: false,
        node: (
          <span className="inline-flex items-center gap-1.5 font-sans text-[12px] font-medium text-futarchyGray11">
            <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading...
          </span>
        ),
      };
    }
    // Insufficient liquidity check — covers both quoter success (extreme impact) and failure (no liquidity)
    if (quoteChain && quoterPreview.insufficientLiquidity) {
      return {
        empty: false,
        node: <span className="font-sans text-[12px] font-medium text-futarchyOrange11 dark:text-futarchyOrangeDark11" title={quoterPreview.error || undefined}>Insufficient liquidity</span>,
      };
    }
    // Any other quote failure: show its reason, not a spot-price estimate
    if (quoteChain && quoterPreview.error) {
      return {
        empty: false,
        node: <span className="font-sans text-[12px] font-medium leading-tight text-futarchyOrange11 dark:text-futarchyOrangeDark11" title={quoterPreview.error}>{quoterPreview.error}</span>,
      };
    }
    if (quoteChain && quoterPreview.amountOut) {
      return { empty: false, node: formatTokenAmount(quoterPreview.amountOut) };
    }
    // Fallback to price calculation
    const inputAmount = parseFloat(amount) || 0;
    const sidePrice = isYesSide ? prices?.yesPrice : prices?.noPrice;
    if (!sidePrice) return { empty: true, node: '0.00' };
    const value = selectedAction === 'Buy'
      ? inputAmount / sidePrice
      : inputAmount * sidePrice;
    return { empty: inputAmount === 0, node: `${formatTokenAmount(value)}${isYesSide ? '' : ' (estimate)'}` };
  })();

  const recoverText = `${formatTokenAmount(parseFloat(amount) || 0)} ${paySymbol}${isYesSide ? '' : ' (estimate)'}`;

  return (
    <>
      <div className="fx-panel relative flex flex-col bg-white dark:bg-futarchyDarkGray3 rounded-xl border border-futarchyGray62 dark:border-futarchyDarkGray42 overflow-hidden">
        {marketHasClosed && (
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-10 flex items-center justify-center">
            <span className="text-white text-2xl font-bold bg-black/50 px-6 py-3 rounded-lg">
              {resolveMarketStatus(config?.marketInfo).labelWithOutcome}
            </span>
          </div>
        )}
        {/* Add connection status display */}
        {connectionError && (
          <div className="p-4 bg-red-100 text-red-700 text-sm">
            {connectionError}
          </div>
        )}

        {isConnecting && (
          <div className="p-4 bg-blue-100 text-blue-700 text-sm">
            Connecting to MetaMask...
          </div>
        )}

        {/* Add error display */}
        {error && (
          <div className="p-4 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="purchase-tabs" role="group" aria-label="Trade side">
          <button
            type="button"
            onClick={() => handleActionSelect('Buy')}
            className={`purchase-tab ${selectedAction === 'Buy' ? 'active' : ''}`}
          >
            Buy
          </button>
          <button
            type="button"
            onClick={() => handleActionSelect('Sell')}
            className={`purchase-tab ${selectedAction === 'Sell' ? 'active' : ''}`}
          >
            Sell
          </button>
        </div>

        <div className="px-5 py-[18px] space-y-5">
          <div className="outcome-switch" role="group" aria-label="Outcome">
            <button
              type="button"
              onClick={() => handleOutcomeSelect('approved')}
              className={selectedOutcome === 'approved' ? 'active' : ''}
            >
              <span className="w-[7px] h-[7px] rounded-full bg-futarchyBlue9" />
              If Yes
            </button>
            <button
              type="button"
              onClick={() => handleOutcomeSelect('reproved')}
              className={selectedOutcome === 'reproved' ? 'active' : ''}
            >
              <span className="w-[7px] h-[7px] rounded-full bg-futarchyGold7" />
              If No
            </button>
          </div>

          <div>
            <div className="io-block">
              <div className="io-label">
                <label htmlFor="fx-trade-amount">You pay</label>
                <span
                  onClick={account ? handleMaxClick : undefined}
                  title={balanceBreakdown.breakdownText ? `Wallet ${balanceBreakdown.symbol} + ${balanceBreakdown.outcomeSymbol} you already hold: ${balanceBreakdown.breakdownText}` : undefined}
                  className={`tabular-nums ${account ? 'cursor-pointer transition-colors hover:text-futarchyGray12 dark:hover:text-futarchyGray3' : ''}`}
                >
                  Balance: {availableBalance.display}
                </span>
              </div>
              <div className={`io-row ${insufficientBalance ? 'is-error' : ''}`}>
                <input
                  id="fx-trade-amount"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={amount}
                  onChange={handleAmountChange}
                  placeholder="0"
                />
                <span className="io-token" title={paySymbol}>{paySymbol}</span>
              </div>
              <div className="io-balance">
                <span className="truncate" title={balanceBreakdown.breakdownText || undefined}>
                  {balanceBreakdown.breakdownText}
                </span>
                <div className="quick-group">
                  <button
                    type="button"
                    className="quick-btn quick-btn--full"
                    disabled={!canUseBalance}
                    onClick={() => setAmountFromWei(availableWei.div(2))}
                  >
                    HALF
                  </button>
                  <button
                    type="button"
                    className="quick-btn quick-btn--full"
                    disabled={!canUseBalance}
                    onClick={handleMaxClick}
                  >
                    MAX
                  </button>
                </div>
              </div>
              <div className="io-quick-actions">
                <div className="quick-group">
                  {QUICK_UNITS.map((units) => (
                    <button
                      key={`units-${units}`}
                      type="button"
                      className="quick-btn quick-btn--dollar"
                      onClick={() => addToAmount(ethers.utils.parseUnits(String(units), 18))}
                    >
                      +{units}
                    </button>
                  ))}
                </div>
                <div className="quick-group">
                  {QUICK_PERCENTS.map((pct) => (
                    <button
                      key={`pct-${pct}`}
                      type="button"
                      className="quick-btn quick-btn--pct"
                      disabled={!canUseBalance}
                      onClick={() => addToAmount(availableWei.mul(pct).div(100))}
                    >
                      +{pct}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="io-swap-wrap">
              <button
                type="button"
                aria-label={selectedAction === 'Buy' ? 'Switch to sell' : 'Switch to buy'}
                className="io-swap"
                onClick={() => {
                  handleActionSelect(selectedAction === 'Buy' ? 'Sell' : 'Buy');
                  setSwapRotation((rotation) => rotation + 180);
                }}
              >
                <svg
                  className="io-swap-icon"
                  viewBox="0 0 18 18"
                  fill="none"
                  aria-hidden="true"
                  style={{ transform: `rotate(${swapRotation}deg)` }}
                >
                  <path d="M5.25 13.5V4.5M5.25 4.5L2.5 7.25M5.25 4.5L8 7.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12.75 4.5V13.5M12.75 13.5L10 10.75M12.75 13.5L15.5 10.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <div>
              <div className="io-label">
                <span>You will get · If {isYesSide ? 'Yes' : 'No'}</span>
                {/* Show toggle on Ethereum mainnet and Gnosis Chain when quote data is available */}
                {quoteChain && quoterPreview.currentPrice ? (
                  <button
                    type="button"
                    onClick={() => setShowPriceInfo(!showPriceInfo)}
                    className="io-more"
                    title={showPriceInfo ? "Hide price details" : "Show price details"}
                  >
                    More info
                    <svg
                      className={`w-3 h-3 transition-transform ${showPriceInfo ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                ) : (
                  <span>≈</span>
                )}
              </div>
              <div className="io-row">
                <span className={`io-value ${receiveValue.empty ? 'is-empty' : ''}`}>{receiveValue.node}</span>
                <span className="io-token" title={receiveSymbol}>{receiveSymbol}</span>
              </div>
            </div>
          </div>

          {/* GET MORE SDAI Button - Show when redirectToCOW is true, in WXDAI mode, and in Buy mode */}
          {redirectToCOW && selectedCurrency === 'WXDAI' && selectedAction === 'Buy' && (
            <div className="flex justify-end -mt-2">
              <a
                href={`https://swap.cow.fi/#/${config?.chainId || 100}/swap/_/${config?.BASE_TOKENS_CONFIG?.currency?.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] font-semibold text-futarchyBlue11 dark:text-futarchyBlue9 hover:underline"
                title={`Get ${getCurrencySymbol()}`}
              >
                Get {getCurrencySymbol()}
              </a>
            </div>
          )}

          <div>
            <div className="trade-summary">
              <div className="trade-summary-row">
                <span>If {isYesSide ? 'No' : 'Yes'}, you recover</span>
                <span>{recoverText}</span>
              </div>
              {/* Price info - on Ethereum mainnet and Gnosis Chain when we have quote data */}
              {quoteChain && quoterPreview.currentPrice && showPriceInfo && (() => {
                const afterPrice = quoterPreview.priceAfter || quoterPreview.executionPrice;
                const val = Number(quoterPreview.priceImpactPct);
                return (
                  <>
                    <div className="trade-summary-row">
                      <span>Price now</span>
                      <span>{parseFloat(quoterPreview.currentPrice).toFixed(4)}</span>
                    </div>
                    {!afterPrice || !Number.isFinite(val) ? (
                      <div className="trade-summary-row">
                        <span>After swap</span>
                        <span className="!text-futarchyOrange11 dark:!text-futarchyOrangeDark11">Insufficient liquidity</span>
                      </div>
                    ) : (
                      <>
                        <div className="trade-summary-row">
                          <span>After swap</span>
                          <span>{parseFloat(afterPrice).toFixed(4)}</span>
                        </div>
                        <div className="trade-summary-row">
                          <span>Price impact</span>
                          <span className={val > 1 ? '!text-futarchyCrimson9' : '!text-futarchyGreen9'}>
                            {val < 0.01 ? val.toFixed(4) : val.toFixed(2)}%
                          </span>
                        </div>
                      </>
                    )}
                  </>
                );
              })()}
            </div>
            {quoterPreview.amountOut && hasPriceImpact && displayedPriceImpact > 1 && (
              <div className={`mt-2 text-[12px] font-medium ${priceImpactTooHigh ? 'text-futarchyCrimson11' : 'text-futarchyOrange11'}`}>
                Price impact {displayedPriceImpact.toFixed(2)}%
              </div>
            )}
            {priceImpactTooHigh && (
              <label className="mt-2 flex items-start gap-2 text-[12px] text-futarchyCrimson11 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tradeAnywayAcknowledged}
                  onChange={(event) => setTradeAnywayAcknowledged(event.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Price impact too high — pool depth insufficient for this size. Trade anyway.
                </span>
              </label>
            )}
          </div>

          {/* Confirm Transaction Button */}
          {account ? (
            <button
              onClick={handleConfirmClick}
              className="trade-cta"
              disabled={!amount || parseFloat(amount) <= 0 || marketHasClosed || insufficientBalance || quoterPreview.isLoading || quoteUnavailable || quoterPreview.insufficientLiquidity || (priceImpactTooHigh && !tradeAnywayAcknowledged)}
            >
              {insufficientBalance ? 'Insufficient balance' : quoterPreview.isLoading ? 'Calculating...' : quoterPreview.insufficientLiquidity || quoteUnavailable ? 'Quote Unavailable' : priceImpactTooHigh && !tradeAnywayAcknowledged ? 'Acknowledge High Impact' : 'Confirm Swap'}
            </button>
          ) : (
            <button onClick={onConnectWallet} className="trade-cta">
              Connect Wallet
            </button>
          )}
        </div>
      </div>

      {isConfirmModalOpen && (
        <ConfirmSwapModal
          onClose={handleConfirmModalClose}
          transactionData={confirmModalData}
          proposalId={proposalId}
          existingBalance={(() => {
            const balance = selectedAction === 'Buy'
              ? (selectedOutcome === 'approved'
                ? positions?.currencyYes?.total
                : positions?.currencyNo?.total)
              : (selectedOutcome === 'approved'
                ? positions?.companyYes?.total
                : positions?.companyNo?.total);

            console.log('Exact balance for swap:', {
              balance,
              action: selectedAction,
              outcome: selectedOutcome,
              positions
            });

            return balance;
          })()}
          additionalCollateralNeeded={(() => {
            // Skip collateral check for sell if not needed
            if (selectedAction === 'Sell' && !SHOWCASE_CHECK_SELL_COLLATERAL) return '0';

            const existingBalance = selectedAction === 'Buy'
              ? (selectedOutcome === 'approved'
                ? positions?.currencyYes?.total || '0'
                : positions?.currencyNo?.total || '0')
              : (selectedOutcome === 'approved'
                ? positions?.companyYes?.total || '0'
                : positions?.companyNo?.total || '0');

            try {
              // Convert to BigNumber for precise calculation
              const amountBN = ethers.utils.parseUnits(amount || '0', 18);
              const existingBalanceBN = ethers.utils.parseUnits(existingBalance || '0', 18);

              console.log('Collateral calculation:', {
                amount,
                amountWei: amountBN.toString(),
                existingBalance,
                existingBalanceWei: existingBalanceBN.toString(),
                action: selectedAction
              });

              // Calculate how much more we need
              const diffBN = amountBN.sub(existingBalanceBN);

              // Return needed amount for both buy and sell
              if (diffBN.gt(ethers.constants.Zero)) {
                const neededAmount = ethers.utils.formatUnits(diffBN, 18);
                console.log('Additional collateral needed:', neededAmount);
                return neededAmount;
              }
              return '0';
            } catch (error) {
              console.error('Error calculating needed amount:', error);
              return '0';
            }
          })()}
          checkSellCollateral={true}
          onTransactionComplete={handleTransactionComplete}
        />
      )}
    </>
  );
};

export default ShowcaseSwapComponent;
