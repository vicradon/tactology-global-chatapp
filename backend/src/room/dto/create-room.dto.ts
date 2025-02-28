import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

class MetaDto {
  @IsOptional()
  @IsBoolean()
  isGeneral?: boolean;
}

export class CreateRoomDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => MetaDto)
  meta?: MetaDto;
}
