/**
 * Wrapper sobre AJV para uso como oracle de conformidade JSON Schema
 * Draft-07 nas features comuns ao subset do plugin Tray.
 *
 * AJV é devDependency — só importado em testes. Runtime do validate.mjs
 * permanece zero-deps.
 *
 * Limitação: AJV não conhece os formats BR custom (cpf, cnpj, ean, ncm).
 * Por isso o oracle só roda em casos onde nosso subset e AJV concordam:
 * required, type, enum, additionalProperties, maxLength, minimum, pattern.
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';

/**
 * Compila um schema com AJV strict mode. Recebe o schema bruto (JSON
 * Schema Draft-07) e retorna uma função `(payload) => boolean`.
 *
 * Os formats BR custom não são reconhecidos pelo AJV — o teste deve
 * filtrar fixtures que dependem deles antes de chamar este oracle.
 */
export function compileWithAjv(schema) {
  const ajv = new Ajv({
    allErrors: true,
    strict: false,
  });
  addFormats(ajv);

  // Stub dos formats custom para AJV não reclamar; sempre retornam true.
  // Quem testar formats BR usa apenas o nosso validador, não o oracle.
  const customFormats = ['cpf', 'cnpj', 'cep', 'ean', 'ncm', 'datetime'];
  for (const fmt of customFormats) {
    ajv.addFormat(fmt, () => true);
  }

  return ajv.compile(schema);
}

/**
 * Roda nosso validador e o AJV no mesmo payload e compara o resultado
 * binário (válido/inválido). Lança se discordarem.
 *
 * @param {object} schema  — JSON Schema Draft-07 compatível com o subset
 * @param {object} payload — payload a validar
 * @param {(schema, payload) => Array} ourValidator — função do nosso lib
 */
export function assertOracleAgrees(schema, payload, ourValidator) {
  const ourErrors = ourValidator(schema, payload);
  const ourValid = ourErrors.length === 0;

  const ajvValidate = compileWithAjv(schema);
  const ajvValid = ajvValidate(payload);

  if (ourValid !== ajvValid) {
    throw new Error(
      `Oracle divergiu para ${JSON.stringify(payload)}: nosso=${ourValid}, ajv=${ajvValid}. ` +
        `Erros nossos: ${JSON.stringify(ourErrors)}. ` +
        `Erros ajv: ${JSON.stringify(ajvValidate.errors)}`,
    );
  }
}
