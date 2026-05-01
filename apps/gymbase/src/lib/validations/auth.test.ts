import { describe, it, expect } from 'vitest'
import { loginSchema, registerSchema } from '@core/lib/validations/auth'

describe('loginSchema', () => {
  it('debería validar un login correcto', () => {
    const validInput = {
      email: 'test@gymbase.com',
      password: '123456',
    }
    const result = loginSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it('debería rechazar email inválido', () => {
    const invalidInput = {
      email: 'not-an-email',
      password: '123456',
    }
    const result = loginSchema.safeParse(invalidInput)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('email')
    }
  })

  it('debería rechazar password menor a 6 caracteres', () => {
    const invalidInput = {
      email: 'test@gymbase.com',
      password: '123',
    }
    const result = loginSchema.safeParse(invalidInput)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('password')
    }
  })

  it('debería rechazar email vacío', () => {
    const invalidInput = {
      email: '',
      password: '123456',
    }
    const result = loginSchema.safeParse(invalidInput)
    expect(result.success).toBe(false)
  })
})

describe('registerSchema', () => {
  it('debería validar un registro correcto', () => {
    const validInput = {
      full_name: 'Juan Pérez',
      email: 'juan@gymbase.com',
      password: '123456',
      confirmPassword: '123456',
    }
    const result = registerSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it('debería rechazar contraseñas que no coinciden', () => {
    const invalidInput = {
      full_name: 'Juan Pérez',
      email: 'juan@gymbase.com',
      password: '123456',
      confirmPassword: 'different',
    }
    const result = registerSchema.safeParse(invalidInput)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('confirmPassword')
    }
  })

  it('debería rechazar nombre muy corto', () => {
    const invalidInput = {
      full_name: 'J',
      email: 'juan@gymbase.com',
      password: '123456',
      confirmPassword: '123456',
    }
    const result = registerSchema.safeParse(invalidInput)
    expect(result.success).toBe(false)
  })
})