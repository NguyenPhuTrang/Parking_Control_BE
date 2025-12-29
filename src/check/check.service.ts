import { BadRequestException, Injectable } from '@nestjs/common';
import { WhitelistService } from '../whitelist/whitelist.service';
import { HistoryService, CheckReason } from '../history/history.service';

export type CheckSource = 'MANUAL' | 'OCR';

function normalizePlate(value: string) {
    return (value || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

@Injectable()
export class CheckService {
    constructor(
        private readonly whitelistService: WhitelistService,
        private readonly historyService: HistoryService,
    ) { }

    /**
     * Check biển số (manual hoặc OCR)
     */
    async checkPlate(params: {
        rawPlate: string;
        checkedByUserId: string;

        // optional cho OCR
        source?: CheckSource;
        imageUrl?: string;
        confidence?: number;
    }) {
        const plate = normalizePlate(params.rawPlate);
        if (!plate) throw new BadRequestException('plate is required');

        const now = new Date();
        const wl = await this.whitelistService.findByPlateNormalized(plate);

        let allowed = false;
        let reason: CheckReason = 'NOT_FOUND';
        let owner: string | undefined;
        let whitelistId: string | undefined;

        if (!wl) {
            allowed = false;
            reason = 'NOT_FOUND';
        } else {
            owner = wl.owner;
            whitelistId = String(wl._id);

            const expired = wl.validTo ? new Date(wl.validTo) < now : false;

            if (!wl.active) {
                allowed = false;
                reason = 'INACTIVE';
            } else if (expired) {
                allowed = false;
                reason = 'EXPIRED';
            } else {
                allowed = true;
                reason = 'MATCHED';
            }
        }

        // ✅ ghi history mọi lần check
        await this.historyService.createLog({
            plate,
            allowed,
            reason,
            checkedBy: params.checkedByUserId,
            whitelistRef: whitelistId,

            source: params.source ?? 'MANUAL',
            imageUrl: params.imageUrl,
            confidence: params.confidence,
        });

        return {
            plate,
            allowed,
            reason,
            owner: owner ?? null,
            whitelistId: whitelistId ?? null,

            // thêm info OCR để frontend hiển thị nếu muốn
            source: params.source ?? 'MANUAL',
            imageUrl: params.imageUrl ?? null,
            confidence: typeof params.confidence === 'number' ? params.confidence : null,

            checkedAt: now.toISOString(),
        };
    }
}
