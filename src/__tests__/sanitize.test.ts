import {
  sanitizeString,
  sanitizeObject,
  sanitizeEmail,
  sanitizePhone,
  sanitizeSlug,
  hasSqlInjection,
  hasXSS,
  validatePassword,
} from "@/lib/sanitize";

// =============================================================================
// sanitizeString
// =============================================================================
describe("sanitizeString", () => {
  it("returns empty string for null and undefined", () => {
    expect(sanitizeString(null)).toBe("");
    expect(sanitizeString(undefined)).toBe("");
  });

  it("converts non-string input to string", () => {
    expect(sanitizeString(123)).toBe("123");
    expect(sanitizeString(true)).toBe("true");
  });

  it("returns plain text unchanged", () => {
    expect(sanitizeString("Hello World")).toBe("Hello World");
  });

  it("removes <script> tags and their content", () => {
    expect(sanitizeString('<script>alert("xss")</script>Hello')).toBe("Hello");
  });

  it("removes all HTML tags", () => {
    expect(sanitizeString("<div><b>Bold</b></div>")).toBe("Bold");
    expect(sanitizeString("<p>Paragraph</p>")).toBe("Paragraph");
    expect(sanitizeString("<br/>")).toBe("");
  });

  it("removes XSS event handler attributes", () => {
    expect(sanitizeString('onclick="alert(1)"')).toBe('');
    expect(sanitizeString("onmouseover=alert(1)")).toBe("");
    expect(sanitizeString('onfocus="steal()"')).toBe("");
  });

  it("removes javascript: protocol", () => {
    expect(sanitizeString("javascript:alert(1)")).toBe("alert(1)");
  });

  it("removes data:text/html protocol", () => {
    // Script tags and their content are removed first, then data:text/html is stripped
    expect(sanitizeString('data:text/html,<script>alert(1)</script>')).toBe(',');
  });

  it("removes vbscript: protocol", () => {
    expect(sanitizeString("vbscript:MsgBox(1)")).toBe("MsgBox(1)");
  });

  it("removes expression() CSS attack", () => {
    expect(sanitizeString("expression(alert(1))")).toBe("alert(1))");
  });

  it("removes null bytes", () => {
    expect(sanitizeString("hello\0world")).toBe("helloworld");
  });

  it("trims whitespace", () => {
    expect(sanitizeString("  hello  ")).toBe("hello");
  });

  it("handles complex mixed XSS payload", () => {
    const payload = '<script>alert("xss")</script><img onerror="steal()" src=x>text';
    const result = sanitizeString(payload);
    expect(result).not.toContain("<script");
    expect(result).not.toContain("onerror");
    // Script tags + content removed; <img...> tag removed by general HTML tag regex
    expect(result).toBe('text');
  });
});

// =============================================================================
// sanitizeObject
// =============================================================================
describe("sanitizeObject", () => {
  it("sanitizes all string values in a flat object", () => {
    const obj = {
      name: '<b>John</b>',
      bio: '<script>alert(1)</script>Dev',
    };
    const result = sanitizeObject(obj);
    expect(result.name).toBe("John");
    expect(result.bio).toBe("Dev");
  });

  it("preserves non-string values", () => {
    const obj = { count: 42, active: true, score: 3.14 };
    const result = sanitizeObject(obj);
    expect(result.count).toBe(42);
    expect(result.active).toBe(true);
    expect(result.score).toBe(3.14);
  });

  it("preserves null and undefined values", () => {
    const obj = { a: null, b: undefined };
    const result = sanitizeObject(obj);
    expect(result.a).toBeNull();
    expect(result.b).toBeUndefined();
  });

  it("recursively sanitizes nested objects", () => {
    const obj = {
      user: {
        name: '<script>xss</script>Alice',
        profile: {
          bio: '<b>Hi</b>',
        },
      },
    };
    const result = sanitizeObject(obj);
    expect(result.user.name).toBe("Alice");
    expect(result.user.profile.bio).toBe("Hi");
  });

  it("sanitizes strings inside arrays", () => {
    const obj = { tags: ["<b>tag1</b>", "safe", "<script>x</script>"] };
    const result = sanitizeObject(obj);
    expect(result.tags).toEqual(["tag1", "safe", ""]);
  });

  it("sanitizes nested objects inside arrays", () => {
    const obj = {
      items: [{ name: "<script>evil</script>Item" }],
    };
    const result = sanitizeObject(obj);
    expect(result.items[0].name).toBe("Item");
  });

  it("returns a new object (does not mutate original)", () => {
    const original = { name: "<b>Test</b>" };
    const result = sanitizeObject(original);
    expect(original.name).toBe("<b>Test</b>");
    expect(result.name).toBe("Test");
  });
});

// =============================================================================
// sanitizeEmail
// =============================================================================
describe("sanitizeEmail", () => {
  it("lowercases the email", () => {
    expect(sanitizeEmail("JOHN@Example.COM")).toBe("john@example.com");
  });

  it("trims whitespace", () => {
    expect(sanitizeEmail("  user@example.com  ")).toBe("user@example.com");
  });

  it("removes special characters", () => {
    expect(sanitizeEmail("user<>{}|\\^~@example.com")).toBe("user@example.com");
  });

  it("keeps valid email characters (@, ., _, +, -)", () => {
    expect(sanitizeEmail("user.name+tag@sub-domain.example.com")).toBe(
      "user.name+tag@sub-domain.example.com"
    );
  });

  it("removes angle brackets and slashes from email", () => {
    // sanitizeEmail strips characters not in [a-z0-9@._+-], not HTML tags
    expect(sanitizeEmail("<script>x</script>@test.com")).toBe("scriptxscript@test.com");
  });
});

// =============================================================================
// sanitizePhone
// =============================================================================
describe("sanitizePhone", () => {
  it("keeps digits", () => {
    expect(sanitizePhone("03001234567")).toBe("03001234567");
  });

  it("keeps common phone separators (+, -, (), space)", () => {
    expect(sanitizePhone("+92 (300) 123-4567")).toBe("+92 (300) 123-4567");
  });

  it("removes letters but keeps spaces", () => {
    // sanitizePhone preserves whitespace as a valid separator
    expect(sanitizePhone("call me at 0300")).toBe("   0300");
  });

  it("removes special characters", () => {
    expect(sanitizePhone("0300!@#$%^&*1234")).toBe("03001234");
  });

  it("trims whitespace", () => {
    expect(sanitizePhone("  03001234567  ")).toBe("03001234567");
  });

  it("returns empty string for non-numeric input", () => {
    expect(sanitizePhone("abcdef")).toBe("");
  });
});

// =============================================================================
// sanitizeSlug
// =============================================================================
describe("sanitizeSlug", () => {
  it("lowercases the slug", () => {
    expect(sanitizeSlug("My-Product-Page")).toBe("my-product-page");
  });

  it("replaces spaces with hyphens", () => {
    expect(sanitizeSlug("my product page")).toBe("my-product-page");
  });

  it("removes special characters", () => {
    expect(sanitizeSlug("hello!@#world")).toBe("helloworld");
  });

  it("removes leading and trailing hyphens", () => {
    expect(sanitizeSlug("--hello-world--")).toBe("hello-world");
  });

  it("collapses multiple hyphens", () => {
    expect(sanitizeSlug("hello---world")).toBe("hello-world");
  });

  it("handles mixed input", () => {
    expect(sanitizeSlug("  My Product! Page  ")).toBe("my-product-page");
  });

  it("returns empty string for all-special-chars input", () => {
    expect(sanitizeSlug("!@#$%^&*()")).toBe("");
  });

  it("keeps numbers in slug", () => {
    expect(sanitizeSlug("product-2024")).toBe("product-2024");
  });
});

// =============================================================================
// hasSqlInjection
// =============================================================================
describe("hasSqlInjection", () => {
  it("detects SELECT keyword", () => {
    expect(hasSqlInjection("SELECT * FROM users")).toBe(true);
  });

  it("detects DROP keyword", () => {
    expect(hasSqlInjection("DROP TABLE users")).toBe(true);
  });

  it("detects UNION keyword", () => {
    expect(hasSqlInjection("1 UNION SELECT * FROM users")).toBe(true);
  });

  it("detects OR-based injection (OR 1=1)", () => {
    expect(hasSqlInjection("admin' OR 1=1 --")).toBe(true);
  });

  it("detects semicolons (statement terminator)", () => {
    expect(hasSqlInjection("'; DROP TABLE users; --")).toBe(true);
  });

  it("detects comment syntax (--)", () => {
    expect(hasSqlInjection("admin--")).toBe(true);
  });

  it("detects hash comment (#)", () => {
    expect(hasSqlInjection("admin#")).toBe(true);
  });

  it("detects block comment (/**/)", () => {
    expect(hasSqlInjection("/**/ SELECT")).toBe(true);
  });

  it("detects AND-based injection", () => {
    expect(hasSqlInjection("' AND 1=1")).toBe(true);
  });

  it("returns false for safe input", () => {
    expect(hasSqlInjection("John Doe")).toBe(false);
    expect(hasSqlInjection("hello world 123")).toBe(false);
    expect(hasSqlInjection("user@example.com")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(hasSqlInjection("select * from users")).toBe(true);
    expect(hasSqlInjection("drop table users")).toBe(true);
  });
});

// =============================================================================
// hasXSS
// =============================================================================
describe("hasXSS", () => {
  it("detects <script> tags", () => {
    expect(hasXSS('<script>alert("xss")</script>')).toBe(true);
  });

  it("detects <iframe> tags", () => {
    expect(hasXSS('<iframe src="evil.com"></iframe>')).toBe(true);
  });

  it("detects <object> tags", () => {
    expect(hasXSS('<object data="evil.swf"></object>')).toBe(true);
  });

  it("detects <embed> tags", () => {
    expect(hasXSS('<embed src="evil.swf">')).toBe(true);
  });

  it("detects event handler attributes", () => {
    expect(hasXSS('onmouseover="alert(1)"')).toBe(true);
    expect(hasXSS('onclick="steal()"')).toBe(true);
  });

  it("detects javascript: protocol", () => {
    expect(hasXSS('href="javascript:alert(1)"')).toBe(true);
  });

  it("detects vbscript: protocol", () => {
    expect(hasXSS('vbscript:MsgBox(1)')).toBe(true);
  });

  it("detects expression()", () => {
    expect(hasXSS("expression(alert(1))")).toBe(true);
  });

  it("detects document.cookie", () => {
    expect(hasXSS("document.cookie")).toBe(true);
  });

  it("detects data:text/html", () => {
    expect(hasXSS('data:text/html,<script>alert(1)</script>')).toBe(true);
  });

  it("returns false for safe input", () => {
    expect(hasXSS("Hello World")).toBe(false);
    expect(hasXSS("user@example.com")).toBe(false);
    expect(hasXSS("Check out this link: https://example.com")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(hasXSS("<SCRIPT>alert(1)</SCRIPT>")).toBe(true);
    expect(hasXSS("ONCLICK=alert(1)")).toBe(true);
  });
});

// =============================================================================
// validatePassword
// =============================================================================
describe("validatePassword", () => {
  it("rejects passwords shorter than 8 characters", () => {
    const result = validatePassword("Short1!");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Password must be at least 8 characters long.");
  });

  it("rejects passwords without uppercase letter", () => {
    const result = validatePassword("lowercase1");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Password must contain at least one uppercase letter.");
  });

  it("rejects passwords without lowercase letter", () => {
    const result = validatePassword("UPPERCASE1");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Password must contain at least one lowercase letter.");
  });

  it("rejects passwords without numbers", () => {
    const result = validatePassword("NoNumbers");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Password must contain at least one number.");
  });

  it("accepts a valid password meeting all requirements", () => {
    const result = validatePassword("ValidPass1");
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("accepts strong passwords with special characters", () => {
    const result = validatePassword("Str0ng!@#$%");
    expect(result.valid).toBe(true);
  });

  it("accepts exactly 8-character valid password", () => {
    const result = validatePassword("Abcd1234");
    expect(result.valid).toBe(true);
  });

  it("returns reason only when invalid", () => {
    const invalid = validatePassword("abc");
    expect(invalid.reason).toBeDefined();

    const valid = validatePassword("Abcd1234");
    expect(valid.reason).toBeUndefined();
  });
});
