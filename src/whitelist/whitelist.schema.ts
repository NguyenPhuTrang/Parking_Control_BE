import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type WhitelistDocument = HydratedDocument<Whitelist>;

@Schema({ timestamps: true })
export class Whitelist {
  @Prop({ required: true, uppercase: true, index: true })
  plate: string;

  @Prop({ required: true })
  owner: string;

  @Prop()
  note?: string;

  @Prop({ default: true })
  active: boolean;

  @Prop()
  validFrom?: Date;

  @Prop()
  validTo?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;
}

export const WhitelistSchema = SchemaFactory.createForClass(Whitelist);
