export class SeedanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SeedanceError';
  }
}

export class SeedanceValidationError extends SeedanceError {
  readonly code = 'SEEDANCE_VALIDATION_ERROR';

  constructor(message: string) {
    super(message);
    this.name = 'SeedanceValidationError';
  }
}

export class SeedanceProviderConfigError extends SeedanceError {
  readonly code = 'SEEDANCE_PROVIDER_CONFIG_ERROR';

  constructor(message: string) {
    super(message);
    this.name = 'SeedanceProviderConfigError';
  }
}

export type SeedanceProviderRequestErrorDetails = {
  httpStatus?: number;
  apiEndpoint?: string;
  provider?: string;
  stage?: 'generate' | 'query';
};

export class SeedanceProviderRequestError extends SeedanceError {
  readonly code = 'SEEDANCE_PROVIDER_REQUEST_ERROR';
  readonly httpStatus?: number;
  readonly apiEndpoint?: string;
  readonly provider?: string;
  readonly stage?: 'generate' | 'query';

  constructor(
    message: string,
    details: SeedanceProviderRequestErrorDetails = {}
  ) {
    super(message);
    this.name = 'SeedanceProviderRequestError';
    this.httpStatus = details.httpStatus;
    this.apiEndpoint = details.apiEndpoint;
    this.provider = details.provider;
    this.stage = details.stage;
  }
}
