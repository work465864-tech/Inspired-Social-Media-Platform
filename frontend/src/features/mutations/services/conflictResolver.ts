export class ConflictResolver {
  shouldRollback(currentValue: unknown, optimisticValue: unknown): boolean {
    return currentValue === optimisticValue;
  }
}
