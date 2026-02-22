export class SkillliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SkillliError';
  }
}

export class SkillValidationError extends SkillliError {
  public details: string[];

  constructor(message: string, details: string[] = []) {
    super(message);
    this.name = 'SkillValidationError';
    this.details = details;
  }
}

export class SkillNotFoundError extends SkillliError {
  constructor(skillName: string) {
    super(`Skill not found: ${skillName}`);
    this.name = 'SkillNotFoundError';
  }
}

export class RegistryError extends SkillliError {
  constructor(message: string) {
    super(message);
    this.name = 'RegistryError';
  }
}

export class SafeguardError extends SkillliError {
  constructor(message: string) {
    super(message);
    this.name = 'SafeguardError';
  }
}

export class InstallError extends SkillliError {
  constructor(message: string) {
    super(message);
    this.name = 'InstallError';
  }
}
