CREATE TABLE IF NOT EXISTS exam_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value VARCHAR(255) NOT NULL,
    description TEXT,
    updated_by VARCHAR(50),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
INSERT INTO exam_settings (setting_key, setting_value, description) VALUES
('questions_per_exam', '40', 'Number of questions to serve'),
('shuffle_questions', '1', 'Shuffle questions'),
('shuffle_options', '1', 'Shuffle options')
ON DUPLICATE KEY UPDATE setting_value = setting_value;