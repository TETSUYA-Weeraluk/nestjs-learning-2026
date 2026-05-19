import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ApiBearerAuth } from '@nestjs/swagger';

// export function Auth(...roles: string[]) {
//   return applyDecorators(
//     SetMetadata('roles', roles),
//     UseGuards(AuthGuard, RolesGuard),
//     ApiBearerAuth(),
//     ApiUnauthorizedResponse({ description: 'Unauthorized' }),
//   );
// }
