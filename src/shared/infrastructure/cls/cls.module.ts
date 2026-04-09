import { Global, Module } from '@nestjs/common';
import { ClsModule as NestClsModule } from 'nestjs-cls';

export const CLS_CORRELATION_ID = 'correlationId';

@Global()
@Module({
  imports: [
    NestClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        generateId: true,
        setup: (cls, req) => {
          const deliveryId = req.headers['x-github-delivery'];
          if (typeof deliveryId === 'string') {
            cls.set(CLS_CORRELATION_ID, deliveryId);
          }
        },
      },
    }),
  ],
})
export class ClsConfigModule {}
