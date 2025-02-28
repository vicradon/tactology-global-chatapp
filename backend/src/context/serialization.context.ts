import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

@Injectable()
export class SerializationContextService {
  private readonly requestScoped = new AsyncLocalStorage<{
    needsSerialization: boolean;
  }>();

  runWithSerialization<T>(callback: () => T): T {
    return this.requestScoped.run({ needsSerialization: true }, callback);
  }

  runWithoutSerialization<T>(callback: () => T): T {
    return this.requestScoped.run({ needsSerialization: false }, callback);
  }

  needsSerialization(): boolean {
    return this.requestScoped.getStore()?.needsSerialization ?? false;
  }
}
