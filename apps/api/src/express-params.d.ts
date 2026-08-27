import "express-serve-static-core";

declare module "express-serve-static-core" {
  interface ParamsDictionary {
    [key: string]: string;
  }
}

declare global {
  function parseInt(string: string | string[], radix?: number): number;
  function parseFloat(string: string | string[]): number;
}

interface NumberConstructor {
  parseInt(string: string | string[], radix?: number): number;
  parseFloat(string: string | string[]): number;
}
