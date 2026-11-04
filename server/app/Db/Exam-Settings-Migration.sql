-- Add to cbt_platform database
-- Exam settings for question limit & shuffling

CREATE TABLE IF NOT EXISTS exam_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value VARCHAR(255) NOT NULL,
    description TEXT,
    updated_by VARCHAR(50),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Default: 40 questions per exam, shuffle enabled
INSERT INTO exam_settings (setting_key, setting_value, description) VALUES
('questions_per_exam', '40', 'Number of questions to serve to student from bank (e.g., 40 out of 200)'),
('shuffle_questions', '1', '1=Shuffle questions randomly for each student, 0=Fixed order'),
('shuffle_options', '1', '1=Shuffle options A-D for each student')
ON DUPLICATE KEY UPDATE setting_value = setting_value;

-- Also add per-exam override (optional)
ALTER TABLE exams ADD COLUMN IF NOT EXISTS questions_limit INT DEFAULT NULL COMMENT 'Override global limit, NULL=use global setting';
ALTER TABLE exams ADD COLUMN IF NOT EXISTS shuffle_enabled TINYINT DEFAULT 1;
