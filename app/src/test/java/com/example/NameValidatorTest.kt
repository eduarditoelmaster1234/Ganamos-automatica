package com.example

import com.example.domain.model.NameValidationError
import com.example.domain.model.NameValidationResult
import com.example.domain.model.NameValidator
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class NameValidatorTest {

  @Test
  fun `empty or whitespace returns Empty error`() {
    val result = NameValidator.validate("   ")
    assertEquals(NameValidationResult.Invalid(NameValidationError.Empty), result)
  }

  @Test
  fun `short name returns TooShort error`() {
    val result = NameValidator.validate("ab")
    assertEquals(NameValidationResult.Invalid(NameValidationError.TooShort), result)
  }

  @Test
  fun `overly long name returns TooLong error`() {
    val result = NameValidator.validate("a".repeat(25))
    assertEquals(NameValidationResult.Invalid(NameValidationError.TooLong), result)
  }

  @Test
  fun `invalid symbols return InvalidCharacters error`() {
    val result = NameValidator.validate("omar<script>")
    assertEquals(NameValidationResult.Invalid(NameValidationError.InvalidCharacters), result)
  }

  @Test
  fun `valid name trims and normalizes internal spaces`() {
    val result = NameValidator.validate("  Sofía   Gómez  ")
    assertTrue(result is NameValidationResult.Valid)
    assertEquals("Sofía Gómez", (result as NameValidationResult.Valid).normalized)
  }
}
