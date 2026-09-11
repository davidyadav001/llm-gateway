import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class QueryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  prompt: string;

  @IsString()
  @MaxLength(100)
  @Matches(/^[a-zA-Z0-9._:-]+$/)
  model: string;
}
