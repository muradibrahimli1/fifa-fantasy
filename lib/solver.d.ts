declare module "javascript-lp-solver" {
  interface Model {
    optimize: string;
    opType: "max" | "min";
    constraints: Record<string, { min?: number; max?: number; equal?: number }>;
    variables: Record<string, Record<string, number>>;
    binaries?: Record<string, 1>;
    ints?: Record<string, 1>;
    options?: { tolerance?: number; timeout?: number };
  }
  interface Solution {
    feasible: boolean;
    result: number;
    bounded: boolean;
    [variable: string]: number | boolean;
  }
  const solver: {
    Solve: (model: Model) => Solution;
  };
  export default solver;
}
