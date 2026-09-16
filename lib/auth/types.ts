export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
};

export type Environment = 'development' | 'production';

export type ApplicationContext = {
  user: AuthUser;
  workspaceId: string;
  environment: Environment;
};