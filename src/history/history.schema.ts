import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type HistoryDocument = HydratedDocument<History>;

@Schema({ timestamps: true })
export class History {
    @Prop({ required: true, trim: true })
    plate: string;

    /**
     * true  = ALLOWED
     * false = DENIED
     */
    @Prop({ required: true })
    allowed: boolean;

    @Prop({
        required: true,
        enum: ['MATCHED', 'NOT_FOUND', 'INACTIVE', 'EXPIRED'],
    })
    reason: 'MATCHED' | 'NOT_FOUND' | 'INACTIVE' | 'EXPIRED';

    /**
     * Người kiểm tra (User._id)
     */
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    checkedBy: Types.ObjectId;

    /**
     * Tham chiếu whitelist (nếu có)
     */
    @Prop({ type: Types.ObjectId, ref: 'Whitelist', default: null })
    whitelistRef?: Types.ObjectId;

    /**
     * MANUAL | OCR
     */
    @Prop({ enum: ['MANUAL', 'OCR'], default: 'MANUAL' })
    source: 'MANUAL' | 'OCR';

    /**
     * URL ảnh đã upload (nếu OCR)
     */
    @Prop({ default: null })
    imageUrl?: string;

    /**
     * Độ tin cậy OCR (0–1)
     */
    @Prop({ default: null })
    confidence?: number;
}

export const HistorySchema = SchemaFactory.createForClass(History);
