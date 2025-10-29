import {
  generateFileLocation,
  getFileExtension,
  sanitizeFilename,
} from '../../utils/storage.util';

describe('Storage Utility', () => {
  describe('generateFileLocation', () => {
    it('should generate a unique file location', () => {
      const userId = 'user123';
      const filename = 'test.pdf';

      const location = generateFileLocation(userId, filename);

      expect(location).toContain(userId);
      expect(location).toContain('.pdf');
    });

    it('should generate different locations for same inputs', () => {
      const userId = 'user123';
      const filename = 'test.pdf';

      const location1 = generateFileLocation(userId, filename);
      const location2 = generateFileLocation(userId, filename);

      expect(location1).not.toBe(location2);
    });

    it('should preserve file extension', () => {
      const userId = 'user123';
      const filename = 'document.docx';

      const location = generateFileLocation(userId, filename);

      expect(location).toMatch(/\.docx$/);
    });
  });

  describe('getFileExtension', () => {
    it('should extract file extension', () => {
      expect(getFileExtension('file.pdf')).toBe('pdf');
      expect(getFileExtension('image.jpg')).toBe('jpg');
      expect(getFileExtension('document.docx')).toBe('docx');
    });

    it('should handle files with multiple dots', () => {
      expect(getFileExtension('my.file.name.pdf')).toBe('pdf');
    });

    it('should return empty string for files without extension', () => {
      expect(getFileExtension('README')).toBe('');
    });

    it('should convert extension to lowercase', () => {
      expect(getFileExtension('file.PDF')).toBe('pdf');
      expect(getFileExtension('IMAGE.JPG')).toBe('jpg');
    });
  });

  describe('sanitizeFilename', () => {
    it('should replace special characters with underscore', () => {
      const filename = 'file@#$%name.pdf';
      const sanitized = sanitizeFilename(filename);

      expect(sanitized).toBe('file____name.pdf');
    });

    it('should keep alphanumeric characters', () => {
      const filename = 'myFile123.pdf';
      const sanitized = sanitizeFilename(filename);

      expect(sanitized).toBe('myFile123.pdf');
    });

    it('should keep dots, hyphens, and underscores', () => {
      const filename = 'my-file_name.v2.pdf';
      const sanitized = sanitizeFilename(filename);

      expect(sanitized).toBe('my-file_name.v2.pdf');
    });

    it('should handle spaces', () => {
      const filename = 'my file name.pdf';
      const sanitized = sanitizeFilename(filename);

      expect(sanitized).toBe('my_file_name.pdf');
    });
  });
});
