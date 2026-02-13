import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {},
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },

  // ===================================================================
  // GPU Acceleration Headers
  // Required for WebGPU + SharedArrayBuffer in Web Workers
  // This enables cross-origin isolation needed by:
  //   - @mlc-ai/web-llm (DeepSeek-R1-Distill-Qwen3-8B via WebGPU)
  //   - @huggingface/transformers (Embeddings + Re-ranking via WebGPU)
  //   - ONNX Runtime Web (WebGPU backend)
  // ===================================================================
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

// Force Restart: 1770881529901