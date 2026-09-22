import type { APIRequestContext, APIResponse } from '@playwright/test';
import { allure, AllureHelper } from './allure-helper';
import type { Logger } from './logger';

export interface ShopifyCart {
  item_count: number;
  total_price: number; // in minor units (pence)
  currency: string;
  items: Array<{ id: number; variant_id: number; title: string; quantity: number; price: number; line_price: number; handle: string }>;
}

export interface ShopifyProduct {
  id: number;
  handle: string;
  title: string;
  vendor: string;
  product_type: string;
  variants: Array<{ id: number; title: string; price: string; available: boolean }>;
}

export interface TimedResponse<T> {
  status: number;
  durationMs: number;
  body: T;
}

/**
 * Client for the public Shopify storefront AJAX API (`/cart.js`, `/products.json`…).
 *
 * When created from `page.request` it shares cookies with the browser context,
 * so a cart built through the API is the same cart the UI shows. Every call is
 * an Allure step with the request and response attached.
 */
export class ShopApiClient {
  constructor(
    private readonly request: APIRequestContext,
    private readonly logger?: Logger,
  ) {}

  async getProducts(): Promise<TimedResponse<{ products: ShopifyProduct[] }>> {
    return this.call('GET', '/products.json');
  }

  async getProduct(handle: string): Promise<TimedResponse<ShopifyProduct>> {
    return this.call('GET', `/products/${handle}.js`);
  }

  async getCart(): Promise<TimedResponse<ShopifyCart>> {
    return this.call('GET', '/cart.js');
  }

  async addToCart(variantId: number, quantity = 1): Promise<TimedResponse<unknown>> {
    return this.call('POST', '/cart/add.js', { items: [{ id: variantId, quantity }] });
  }

  async clearCart(): Promise<TimedResponse<ShopifyCart>> {
    return this.call('POST', '/cart/clear.js', {});
  }

  /** Raw call without JSON parsing — used by negative tests. */
  async raw(method: 'GET' | 'POST', url: string, data?: unknown): Promise<APIResponse> {
    return method === 'GET' ? this.request.get(url) : this.request.post(url, { data });
  }

  private async call<T>(method: 'GET' | 'POST', url: string, data?: unknown): Promise<TimedResponse<T>> {
    return allure.step(`API ${method} ${url}`, async (ctx) => {
      await ctx.parameter('method', method);
      await ctx.parameter('url', url);
      if (data !== undefined) await AllureHelper.attachJson(`Request ${method} ${url}`, data);

      const started = performance.now();
      const response = await this.raw(method, url, data);
      const durationMs = Math.round(performance.now() - started);
      const text = await response.text();

      await ctx.parameter('status', String(response.status()));
      await ctx.parameter('duration', `${durationMs} ms`);
      this.logger?.info(`${method} ${url} -> ${response.status()} in ${durationMs}ms`);

      let body: T;
      try {
        body = JSON.parse(text) as T;
        await AllureHelper.attachJson(`Response ${response.status()} ${url} (${durationMs} ms)`, body);
      } catch {
        await AllureHelper.attachText(`Response ${response.status()} ${url} (non-JSON)`, text.slice(0, 5_000));
        throw new Error(`API ${method} ${url} returned HTTP ${response.status()} with a non-JSON body`);
      }
      if (!response.ok()) {
        throw new Error(`API ${method} ${url} failed with HTTP ${response.status()}: ${text.slice(0, 300)}`);
      }
      return { status: response.status(), durationMs, body };
    });
  }
}
