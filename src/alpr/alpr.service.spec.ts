import { Test, TestingModule } from '@nestjs/testing';
import { AlprService } from './alpr.service';

describe('AlprService', () => {
  let service: AlprService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlprService],
    }).compile();

    service = module.get<AlprService>(AlprService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
