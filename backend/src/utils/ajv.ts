import Ajv, { JSONSchemaType } from 'ajv';
import { BAD_REQUEST } from './errors.js';

const ajv = new Ajv({ allErrors: true });

export function validateOrThrow<T>(
  schema: JSONSchemaType<T>,
  data: unknown,
  where: string
): T {
  const validate = ajv.compile(schema);
  
  if (!validate(data)) {
    const errors = validate.errors || [];
    const errorMessages = errors.map(err => 
      `${err.instancePath || 'root'} ${err.message}`
    ).join(', ');
    
    throw BAD_REQUEST(
      `Validation failed in ${where}: ${errorMessages}`,
      { validationErrors: errors }
    );
  }
  
  return data as T;
}

export { ajv };