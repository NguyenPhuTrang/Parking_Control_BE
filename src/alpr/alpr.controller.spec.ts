import { Test, TestingModule } from '@nestjs/testing';
import { AlprController } from './alpr.controller';

describe('AlprController', () => {
  let controller: AlprController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlprController],
    }).compile();

    controller = module.get<AlprController>(AlprController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
