import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the Next.js "N" logo overlay in development
  devIndicators: false,
  serverExternalPackages: [
    "@langfuse/otel",
    "@langfuse/tracing",
    "@langfuse/core",
    "@opentelemetry/sdk-trace-node",
    "@opentelemetry/sdk-trace-base",
    "@opentelemetry/exporter-trace-otlp-http",
    "@opentelemetry/otlp-exporter-base",
    "@opentelemetry/core",
    "@opentelemetry/api",
  ],
};

export default nextConfig;
