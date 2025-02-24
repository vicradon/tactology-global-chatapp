import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  testingWebsockets(): string {
    return '<h1>So this is a test</h1>';
  }
}
