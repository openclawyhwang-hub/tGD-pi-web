import { describe, it, expect } from "vitest";
import {
  normalizeFilePathSlashes,
  encodeFilePathForApi,
  getFileName,
  getRelativeFilePath,
  joinFilePath,
} from "../file-paths";

describe("normalizeFilePathSlashes", () => {
  it("converts Windows backslashes to forward slashes", () => {
    expect(normalizeFilePathSlashes("C:\\Users\\foo\\bar")).toBe("C:/Users/foo/bar");
  });

  it("converts UNC paths", () => {
    expect(normalizeFilePathSlashes("\\\\server\\share\\file")).toBe("//server/share/file");
  });

  it("leaves Unix paths unchanged", () => {
    expect(normalizeFilePathSlashes("/home/user/file")).toBe("/home/user/file");
  });

  it("leaves relative paths unchanged", () => {
    expect(normalizeFilePathSlashes("src/components/App.tsx")).toBe("src/components/App.tsx");
  });
});

describe("encodeFilePathForApi", () => {
  it("encodes spaces and special characters", () => {
    // Leading / is stripped by filter(Boolean), each segment encoded separately
    expect(encodeFilePathForApi("/my files/test (1).ts")).toBe("my%20files/test%20(1).ts");
  });

  it("normalizes backslashes before encoding", () => {
    // : is encoded to %3A
    expect(encodeFilePathForApi("C:\\my files\\test.ts")).toBe("C%3A/my%20files/test.ts");
  });

  it("filters empty segments", () => {
    expect(encodeFilePathForApi("/home//user/")).toBe("home/user");
  });

  it("handles simple path", () => {
    expect(encodeFilePathForApi("/home/user/file.ts")).toBe("home/user/file.ts");
  });
});

describe("getFileName", () => {
  it("extracts file name from Unix path", () => {
    expect(getFileName("/home/user/document.pdf")).toBe("document.pdf");
  });

  it("extracts file name from Windows path", () => {
    expect(getFileName("C:\\Users\\foo\\bar.txt")).toBe("bar.txt");
  });

  it("handles trailing slashes", () => {
    expect(getFileName("/home/user/dir/")).toBe("dir");
  });

  it("handles bare filename", () => {
    expect(getFileName("file.txt")).toBe("file.txt");
  });
});

describe("getRelativeFilePath", () => {
  it("returns relative path when file is under cwd", () => {
    expect(getRelativeFilePath("/home/user/project/src/App.tsx", "/home/user/project"))
      .toBe("src/App.tsx");
  });

  it("returns original path when file is not under cwd", () => {
    expect(getRelativeFilePath("/other/path/file.ts", "/home/user/project"))
      .toBe("/other/path/file.ts");
  });

  it("returns original path when cwd is undefined", () => {
    expect(getRelativeFilePath("/home/user/file.ts")).toBe("/home/user/file.ts");
  });

  it("handles cwd with trailing slash", () => {
    expect(getRelativeFilePath("/home/user/project/src/App.tsx", "/home/user/project/"))
      .toBe("src/App.tsx");
  });
});

describe("joinFilePath", () => {
  it("joins parent and child", () => {
    expect(joinFilePath("/home/user", "file.ts")).toBe("/home/user/file.ts");
  });

  it("strips trailing slash from parent", () => {
    expect(joinFilePath("/home/user/", "file.ts")).toBe("/home/user/file.ts");
  });

  it("normalizes backslashes in parent", () => {
    expect(joinFilePath("C:\\Users\\foo", "bar.ts")).toBe("C:/Users/foo/bar.ts");
  });
});
