const KLEROS_IPFS_NETLIFY_FUNCTION_ENDPOINT =
  "https://kleros-api.netlify.app/.netlify/functions/upload-to-ipfs";

/**
 * Send file to IPFS network.
 * @param {string} fileName - The name that will be used to store the file. This is useful to preserve extension type.
 * @param {ArrayBuffer | Uint8Array | Buffer} data - The raw data from the file to upload.
 * @returns {Promise<string>} - The path of the stored item.
 */
export default async function ipfsPublish(fileName, data) {
  const payload = new FormData();
  payload.append("file", new Blob([data]), fileName);
  const operation = "file";
  const pinToGraph = "true";

  const response = await fetch(
    `${KLEROS_IPFS_NETLIFY_FUNCTION_ENDPOINT}?operation=${operation}&pinToGraph=${pinToGraph}`,
    {
      method: "POST",
      body: payload,
    },
  );

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`IPFS upload failed (${response.status}): ${text.slice(0, 200)}`);
  }

  let result;
  try {
    result = JSON.parse(text);
  } catch {
    throw new Error(`IPFS upload returned non-JSON: ${text.slice(0, 200)}`);
  }

  if (!result?.cids?.[0]) {
    throw new Error(`IPFS upload missing cid: ${text.slice(0, 200)}`);
  }

  return result.cids[0];
}
