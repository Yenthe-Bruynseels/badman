import { AuthenticatedUser } from '../services';
import { ApiError } from './api.error';
import { logger } from './logger';

export const canExecute = (
  user: AuthenticatedUser,
  permissions: {
    anyPermissions?: string[];
    allPermissions?: string[];
  }
) => {
  if (user === null) {
    throw new ApiError({ code: 401, message: 'Not authenticated' });
  }

  if (permissions.anyPermissions && permissions.anyPermissions.length > 0) {
    if (!user.hasAnyPermission(permissions.anyPermissions)) {
      logger.warn("User tried something it should't have done", {
        required: {
          anyClaim: permissions.anyPermissions,
        },
        received: user?.permissions,
      });
      throw new ApiError({
        code: 401,
        message: "You don't have permission to do this ",
      });
    }
  }

  if (permissions.allPermissions && permissions.allPermissions.length > 0) {
    if (!user.hasAllPermission(permissions.allPermissions)) {
      logger.warn("User tried something it should't have done", {
        required: {
          allClaim: permissions.allPermissions,
        },
        received: user?.permissions,
      });
      throw new ApiError({
        code: 401,
        message: "You don't have permission to do this ",
      });
    }
  }
};