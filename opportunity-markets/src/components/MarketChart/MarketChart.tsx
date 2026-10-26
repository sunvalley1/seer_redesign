import { useMarketChartData, type ChartData } from '../../hooks/chart/useChartData';
import {
  INVALID_RESULT_OUTCOME_TEXT,
  Market,
  MarketTypes,
  getMarketType,
} from '@seer-pm/sdk';
import { format } from 'date-fns';
import {
  LineSeries,
  LineStyle,
  UTCTimestamp,
  createChart,
} from 'lightweight-charts';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cssRgb, useTheme } from '../../lib/theme';
import Legend from './Legend';

export interface IOutcomeData {
  outcome: {
    name: string;
    color: string;
  };
  data: Array<{ time: UTCTimestamp; value: number }>;
}

/**
 * Series palette: seerbeta categorical tones, mid-luminance so every series
 * stays legible on both the cream and the night surface. No duplicates.
 */
const CHART_COLORS = [
  '#6366f1',
  '#f59e0b',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#00b955',
  '#e5484d',
  '#2d6bf7',
  '#f58231',
  '#469990',
  '#9a6324',
  '#6b7280',
];

const FALLBACK_SERIES_COLOR = '#6b7280';

/**
 * Curated palette first; past its length, rotate the hue by the golden angle
 * so every additional series still gets a distinct color.
 */
function getSeriesColor(index: number): string {
  const curated = CHART_COLORS[index];
  if (curated) return curated;
  const hue = Math.round((index * 137.508) % 360);
  return `hsl(${hue} 65% 65%)`;
}

function getSeries(market: Market, chartData: ChartData['chartData']) {
  if (market.type === 'Futarchy') {
    return chartData
      .map((x, index) => ({
        ...x,
        data: x.data,
        originalIndex: index,
      }))
      .sort((a, b) => b.data[b.data.length - 1][1] - a.data[a.data.length - 1][1]);
  }

  if (getMarketType(market) === MarketTypes.SCALAR) {
    return chartData;
  }

  return chartData
    .filter((x) => x.name !== INVALID_RESULT_OUTCOME_TEXT)
    .sort((a, b) => b.data[b.data.length - 1][1] - a.data[a.data.length - 1][1]);
}

function getFilteredSeries(market: Market, chartData: ChartData['chartData']) {
  const rawSeries = getSeries(market, chartData);
  if (!rawSeries.length) return rawSeries;

  let validStartIndex = 0;
  const dataLength = rawSeries[0].data.length;

  for (let i = 0; i < dataLength; i++) {
    const hasExtreme = rawSeries.some((series) => {
      const value = series.data[i][1];
      return value > 99.9 || value < 0.1;
    });

    if (!hasExtreme && i > 0) {
      validStartIndex = i;
      break;
    }
  }

  if (validStartIndex > 0) {
    return rawSeries.map((series) => ({
      ...series,
      data: series.data.slice(validStartIndex),
    }));
  }

  return rawSeries;
}

export default function MarketChart({
  market,
  outcomeIndex,
}: {
  market: Market;
  outcomeIndex?: number;
}) {
  const { data, isPending: isPendingChart } = useMarketChartData(market, outcomeIndex);
  const { chartData = [] } = data ?? {};
  const series = useMemo(() => {
    const filtered = getFilteredSeries(market, chartData);
    if (outcomeIndex === undefined) return filtered;
    return filtered.filter((serie) => serie.name === market.outcomes[outcomeIndex]);
  }, [market, chartData, outcomeIndex]);

  return (
    <div className="w-full">
      {isPendingChart ? (
        <div className="mt-3 h-[300px] w-full animate-pulse rounded-panel bg-wall" />
      ) : series.length > 0 ? (
        <LightweightChart
          series={series.map((serie, index) => ({
            outcome: {
              name: serie.name,
              color: getSeriesColor(index),
            },
            data: serie.data.map((d) => ({
              time: d[0] as UTCTimestamp,
              value: d[1],
            })),
          }))}
          market={market}
          showLegend={outcomeIndex === undefined}
        />
      ) : (
        <p className="mt-3 text-sm text-muted">No chart data.</p>
      )}
    </div>
  );
}

function LightweightChart({
  series,
  market,
  showLegend = true,
}: {
  series: IOutcomeData[];
  market: Market;
  showLegend?: boolean;
}) {
  const outcomeNames = useMemo(() => series.map(({ outcome }) => outcome.name), [series]);

  const [visibleOutcomes, setVisibleOutcomes] = useState<Set<string>>(new Set(outcomeNames));
  const [tooltipData, setTooltipData] = useState<{
    time: UTCTimestamp;
    values: Array<{ name: string; value: number; color: string }>;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    setVisibleOutcomes(new Set(outcomeNames));
  }, [outcomeNames]);

  const truncateOutcomeName = (name: string, maxLength = 12) => {
    if (!name) return '';
    if (name.length <= maxLength) return name;
    return `${name.slice(0, maxLength - 2)}…`;
  };

  const handleToggleOutcome = (outcomeName: string) => {
    setVisibleOutcomes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(outcomeName)) {
        newSet.delete(outcomeName);
      } else {
        newSet.add(outcomeName);
      }
      return newSet;
    });
  };

  const theme = useTheme();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const visibleKey = Array.from(visibleOutcomes).join(',');

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current?.clientWidth });
    };

    const accentColor = cssRgb('ink-4');
    const gridLinesColor = cssRgb('border');

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: accentColor,
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
      autoSize: true,
      rightPriceScale: {
        borderVisible: false,
        visible: true,
      },
      leftPriceScale: {
        borderVisible: false,
        visible: false,
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        minBarSpacing: 0.001,
      },
      grid: {
        vertLines: { color: gridLinesColor, style: LineStyle.SparseDotted },
        horzLines: { color: gridLinesColor, style: LineStyle.SparseDotted },
      },
    });
    chart.timeScale().fitContent();

    const seriesInstances: Array<{ data: IOutcomeData; color: string }> = [];
    for (const outcomeData of series) {
      if (visibleOutcomes.has(outcomeData.outcome.name)) {
        const lineSeries = chart.addSeries(LineSeries, {
          color: outcomeData.outcome.color,
          lineWidth: 2,
          title: truncateOutcomeName(outcomeData.outcome.name),
          priceFormat: {
            type: 'price',
            precision: market.type === 'Futarchy' ? 3 : 2,
            minMove: 0.001,
          },
        });
        lineSeries.setData(outcomeData.data);
        seriesInstances.push({ data: outcomeData, color: outcomeData.outcome.color });
      }
    }

    chart.subscribeCrosshairMove((param) => {
      if (
        param.point === undefined ||
        !param.time ||
        param.point.x < 0 ||
        param.point.x > chartContainerRef.current!.clientWidth ||
        param.point.y < 0 ||
        param.point.y > chartContainerRef.current!.clientHeight
      ) {
        setTooltipData(null);
        return;
      }

      const time = param.time as UTCTimestamp;
      const values: Array<{ name: string; value: number; color: string }> = [];

      for (const { data: outcomeSeries, color } of seriesInstances) {
        if (visibleOutcomes.has(outcomeSeries.outcome.name)) {
          const dataPoint = outcomeSeries.data.find((d) => d.time === time);
          if (dataPoint) {
            values.push({
              name: outcomeSeries.outcome.name,
              value: dataPoint.value,
              color: color || FALLBACK_SERIES_COLOR,
            });
          }
        }
      }

      if (values.length > 0) {
        setTooltipData({
          time,
          values,
          x: param.point.x,
          y: param.point.y,
        });
      } else {
        setTooltipData(null);
      }
    });

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [series, visibleKey, market.type, theme]);

  return (
    <div className="relative mt-2 flex size-full flex-col">
      {showLegend && (
        <Legend
          outcomesData={series}
          visibleOutcomes={visibleOutcomes}
          onToggleOutcome={handleToggleOutcome}
          market={market}
        />
      )}
      <div ref={chartContainerRef} />
      {tooltipData && (
        <div
          className="pointer-events-none absolute z-10 rounded-panel border border-edge bg-plaque p-3 shadow-panel"
          style={{
            left: `${tooltipData.x + 10}px`,
            top: `${tooltipData.y - 10}px`,
            transform: 'translateY(-100%)',
          }}
        >
          <div className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-muted">
            {format(new Date(tooltipData.time * 1000), 'MMM d, yyyy HH:mm')}
          </div>
          <div className="space-y-1">
            {tooltipData.values.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[12.5px] font-medium text-paper">{item.name}:</span>
                <span className="font-mono text-[12.5px] font-semibold text-muted">
                  {item.value.toFixed(market.type === 'Futarchy' ? 3 : 2)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
