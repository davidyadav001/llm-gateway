import { IsEnum, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { AccessPermission } from '../entities/model-access.entity';

export class GrantAccessDto {
  @IsUUID()
  userId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  model: string;

  @IsEnum(AccessPermission)
  permission: AccessPermission;
}
