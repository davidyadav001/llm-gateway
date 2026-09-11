import { IsEmail, IsEnum, IsOptional, IsStrongPassword, MaxLength } from 'class-validator';
import { UserRole } from '../../users/entities/user.entity';

export class RegisterDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsStrongPassword({
    minLength: 10,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 0,
  })
  password: string;

  // Only honored when the caller is an Admin (see AuthService). Anonymous
  // self-registration always defaults to Researcher regardless of this field.
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
