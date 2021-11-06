export default function <T extends object, U extends keyof T>(
  obj: T,
  attributes: Array<U>,
): T {
  const result = { ...obj };
  attributes.forEach((attribute) => {
    delete result[attribute];
  });
  return result;
}
