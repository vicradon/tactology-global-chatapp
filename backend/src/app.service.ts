import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return '<h1>Server is Running!</h1>';
  }

  testingWebsockets(): string {
    return '<h1>So this is a test</h1>';
  }
}
