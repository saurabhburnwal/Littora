import "@testing-library/jest-dom";

// Mock ResizeObserver for Recharts components in jsdom environment
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
