CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_type_enum AS ENUM ('freelancer', 'client');
CREATE TYPE project_status_enum AS ENUM ('open', 'in_progress', 'completed', 'cancelled');
CREATE TYPE proposal_status_enum AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn');
CREATE TYPE contract_status_enum AS ENUM ('active', 'completed', 'cancelled', 'disputed');
CREATE TYPE payment_status_enum AS ENUM ('pending', 'completed', 'failed', 'refunded');


CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    profile_picture_url VARCHAR(255),
    bio TEXT,
    user_type user_type_enum NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    phone_number VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    location VARCHAR(100),
    availability VARCHAR(255),
    hourly_rate DECIMAL(10, 2),
    skills TEXT[],
    payment_info JSONB,
    external_auth JSONB
);

CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_category_id INTEGER REFERENCES categories(category_id)
);

CREATE TABLE projects (
    project_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES users(user_id),
    category_id INTEGER NOT NULL REFERENCES categories(category_id),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    budget DECIMAL(15, 2),
    status project_status_enum NOT NULL DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deadline TIMESTAMP WITH TIME ZONE,
    skills_required TEXT[],
    attachments JSONB
);

CREATE TABLE proposals (
    proposal_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(project_id),
    freelancer_id UUID NOT NULL REFERENCES users(user_id),
    cover_letter TEXT NOT NULL,
    proposed_price DECIMAL(15, 2),
    estimated_completion_days INTEGER,
    status proposal_status_enum NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE contracts (
    contract_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(project_id),
    proposal_id UUID NOT NULL REFERENCES proposals(proposal_id),
    client_id UUID NOT NULL REFERENCES users(user_id),
    freelancer_id UUID NOT NULL REFERENCES users(user_id),
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    agreed_price DECIMAL(15, 2),
    terms_and_conditions TEXT,
    status contract_status_enum NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE reviews (
    review_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID NOT NULL REFERENCES contracts(contract_id),
    reviewer_id UUID NOT NULL REFERENCES users(user_id),
    reviewee_id UUID NOT NULL REFERENCES users(user_id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE messages (
    message_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES users(user_id),
    recipient_id UUID NOT NULL REFERENCES users(user_id),
    content TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_read BOOLEAN DEFAULT FALSE,
    parent_message_id UUID REFERENCES messages(message_id)
);

CREATE TABLE payments (
    payment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID REFERENCES contracts(contract_id),
    payer_id UUID NOT NULL REFERENCES users(user_id),
    payee_id UUID NOT NULL REFERENCES users(user_id),
    amount DECIMAL(15, 2) NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    payment_method VARCHAR(50),
    status payment_status_enum NOT NULL DEFAULT 'pending',
    transaction_id VARCHAR(255)
);

CREATE TABLE portfolio_items (
    portfolio_item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id),
    title VARCHAR(255),
    description TEXT,
    image_url VARCHAR(255),
    project_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE skill_tags (
    skill_tag_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE user_skills (
    user_id UUID NOT NULL REFERENCES users(user_id),
    skill_tag_id INTEGER NOT NULL REFERENCES skill_tags(skill_tag_id),
    PRIMARY KEY (user_id, skill_tag_id)
);

CREATE TABLE project_skills (
    project_id UUID NOT NULL REFERENCES projects(project_id),
    skill_tag_id INTEGER NOT NULL REFERENCES skill_tags(skill_tag_id),
    PRIMARY KEY (project_id, skill_tag_id)
);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_proposals_updated_at
BEFORE UPDATE ON proposals
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_contracts_updated_at
BEFORE UPDATE ON contracts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();



-- Вставка данных в таблицу categories
INSERT INTO categories (name, description, parent_category_id) VALUES
('Web Development', 'Develop websites and web applications', NULL),
('Mobile Development', 'Develop mobile applications for iOS and Android', NULL),
('Design', 'Graphic design, UI/UX design, and more', NULL),
('Writing & Translation', 'Content creation, translation services', NULL),
('Web Design', 'Web design services', 1),
('Front-end Development', 'Front-end development services', 1),
('Back-end Development', 'Back-end development services', 1),
('UI/UX Design', 'User Interface and User Experience design', 3),
('Logo Design', 'Design logos for businesses', 3),
('Android Development', 'Android app development', 2),
('iOS Development', 'iOS app development', 2),
('Copywriting', 'Content creation and copywriting', 4),
('Translation', 'Translation of documents and content', 4);

-- Вставка данных в таблицу users
INSERT INTO users (username, email, password_hash, first_name, last_name, user_type, is_active, skills, hourly_rate, location) VALUES
('john_doe', 'john.doe@example.com', '$2b$10$hashedpassword', 'John', 'Doe', 'client', TRUE, NULL, NULL, 'New York'),
('jane_smith', 'jane.smith@example.com', '$2b$10$hashedpassword', 'Jane', 'Smith', 'freelancer', TRUE, '{"JavaScript", "React", "Node.js"}', 50.00, 'San Francisco'),
('peter_jones', 'peter.jones@example.com', '$2b$10$hashedpassword', 'Peter', 'Jones', 'freelancer', TRUE, '{"iOS", "Swift"}', 60.00, 'Los Angeles'),
('alice_brown', 'alice.brown@example.com', '$2b$10$hashedpassword', 'Alice', 'Brown', 'client', TRUE, NULL, NULL, 'Chicago'),
('bob_williams', 'bob.williams@example.com', '$2b$10$hashedpassword', 'Bob', 'Williams', 'freelancer', TRUE, '{"UI/UX", "Figma"}', 45.00, 'Austin'),
('charlie_davis', 'charlie.davis@example.com', '$2b$10$hashedpassword', 'Charlie', 'Davis', 'client', TRUE, NULL, NULL, 'Miami');

-- Вставка данных в таблицу projects
INSERT INTO projects (client_id, category_id, title, description, budget, status, deadline, skills_required) VALUES
((SELECT user_id FROM users WHERE username = 'john_doe'), (SELECT category_id FROM categories WHERE name = 'Web Development'), 'Website Redesign', 'Redesign a modern and responsive website.', 5000.00, 'open', '2024-03-31', '{"HTML", "CSS", "JavaScript", "React"}'),
((SELECT user_id FROM users WHERE username = 'alice_brown'), (SELECT category_id FROM categories WHERE name = 'Mobile Development'), 'iOS App Development', 'Develop an iOS application for a specific purpose.', 8000.00, 'open', '2024-04-15', '{"Swift", "iOS"}'),
((SELECT user_id FROM users WHERE username = 'charlie_davis'), (SELECT category_id FROM categories WHERE name = 'Design'), 'Logo Design', 'Design a logo for a new company.', 1000.00, 'completed', '2024-02-28', '{"Adobe Illustrator", "Logo Design"}');

-- Вставка данных в таблицу proposals
INSERT INTO proposals (project_id, freelancer_id, cover_letter, proposed_price, estimated_completion_days, status) VALUES
((SELECT project_id FROM projects WHERE title = 'Website Redesign'), (SELECT user_id FROM users WHERE username = 'jane_smith'), 'I am very interested in this project and have the skills to complete it.', 4500.00, 30, 'accepted'),
((SELECT project_id FROM projects WHERE title = 'iOS App Development'), (SELECT user_id FROM users WHERE username = 'peter_jones'), 'I have experience in developing iOS applications.', 7500.00, 45, 'pending');

-- Вставка данных в таблицу contracts
INSERT INTO contracts (project_id, proposal_id, client_id, freelancer_id, start_date, end_date, agreed_price, terms_and_conditions, status) VALUES
((SELECT project_id FROM projects WHERE title = 'Website Redesign'), (SELECT proposal_id FROM proposals WHERE freelancer_id = (SELECT user_id FROM users WHERE username = 'jane_smith')), (SELECT user_id FROM users WHERE username = 'john_doe'), (SELECT user_id FROM users WHERE username = 'jane_smith'), '2024-02-01', '2024-03-01', 4500.00, 'Terms and conditions apply.', 'completed');

-- Вставка данных в таблицу reviews
INSERT INTO reviews (contract_id, reviewer_id, reviewee_id, rating, comment) VALUES
((SELECT contract_id FROM contracts WHERE freelancer_id = (SELECT user_id FROM users WHERE username = 'jane_smith')), (SELECT user_id FROM users WHERE username = 'john_doe'), (SELECT user_id FROM users WHERE username = 'jane_smith'), 5, 'Great work!'),
((SELECT contract_id FROM contracts WHERE freelancer_id = (SELECT user_id FROM users WHERE username = 'jane_smith')), (SELECT user_id FROM users WHERE username = 'jane_smith'), (SELECT user_id FROM users WHERE username = 'john_doe'), 4, 'Good communication.');

-- Вставка данных в таблицу messages
INSERT INTO messages (sender_id, recipient_id, content, sent_at, is_read) VALUES
((SELECT user_id FROM users WHERE username = 'john_doe'), (SELECT user_id FROM users WHERE username = 'jane_smith'), 'Hello, Jane!', '2024-02-10', TRUE),
((SELECT user_id FROM users WHERE username = 'jane_smith'), (SELECT user_id FROM users WHERE username = 'john_doe'), 'Hi John, how can I help?', '2024-02-11', TRUE);

-- Вставка данных в таблицу payments
INSERT INTO payments (contract_id, payer_id, payee_id, amount, payment_method, status) VALUES
((SELECT contract_id FROM contracts WHERE freelancer_id = (SELECT user_id FROM users WHERE username = 'jane_smith')), (SELECT user_id FROM users WHERE username = 'john_doe'), (SELECT user_id FROM users WHERE username = 'jane_smith'), 4500.00, 'PayPal', 'completed');

-- Вставка данных в таблицу portfolio_items
INSERT INTO portfolio_items (user_id, title, description, image_url, project_url) VALUES
((SELECT user_id FROM users WHERE username = 'jane_smith'), 'Website Design', 'Designed a responsive website for a client.', 'https://example.com/portfolio/website1.jpg', 'https://example.com/website1'),
((SELECT user_id FROM users WHERE username = 'peter_jones'), 'iOS App', 'Developed a mobile app for a client.', 'https://example.com/portfolio/app1.jpg', 'https://example.com/app1');

-- Вставка данных в таблицу skill_tags
INSERT INTO skill_tags (name) VALUES
('JavaScript'),
('React'),
('Node.js'),
('HTML'),
('CSS'),
('Swift'),
('iOS'),
('UI/UX'),
('Figma'),
('Adobe Illustrator'),
('Logo Design');

-- Вставка данных в таблицу user_skills
INSERT INTO user_skills (user_id, skill_tag_id) VALUES
((SELECT user_id FROM users WHERE username = 'jane_smith'), (SELECT skill_tag_id FROM skill_tags WHERE name = 'JavaScript')),
((SELECT user_id FROM users WHERE username = 'jane_smith'), (SELECT skill_tag_id FROM skill_tags WHERE name = 'React')),
((SELECT user_id FROM users WHERE username = 'jane_smith'), (SELECT skill_tag_id FROM skill_tags WHERE name = 'Node.js')),
((SELECT user_id FROM users WHERE username = 'peter_jones'), (SELECT skill_tag_id FROM skill_tags WHERE name = 'Swift')),
((SELECT user_id FROM users WHERE username = 'peter_jones'), (SELECT skill_tag_id FROM skill_tags WHERE name = 'iOS')),
((SELECT user_id FROM users WHERE username = 'bob_williams'), (SELECT skill_tag_id FROM skill_tags WHERE name = 'UI/UX')),
((SELECT user_id FROM users WHERE username = 'bob_williams'), (SELECT skill_tag_id FROM skill_tags WHERE name = 'Figma'));

-- Вставка данных в таблицу project_skills
INSERT INTO project_skills (project_id, skill_tag_id) VALUES
((SELECT project_id FROM projects WHERE title = 'Website Redesign'), (SELECT skill_tag_id FROM skill_tags WHERE name = 'HTML')),
((SELECT project_id FROM projects WHERE title = 'Website Redesign'), (SELECT skill_tag_id FROM skill_tags WHERE name = 'CSS')),
((SELECT project_id FROM projects WHERE title = 'Website Redesign'), (SELECT skill_tag_id FROM skill_tags WHERE name = 'JavaScript')),
((SELECT project_id FROM projects WHERE title = 'Website Redesign'), (SELECT skill_tag_id FROM skill_tags WHERE name = 'React')),
((SELECT project_id FROM projects WHERE title = 'iOS App Development'), (SELECT skill_tag_id FROM skill_tags WHERE name = 'Swift')),
((SELECT project_id FROM projects WHERE title = 'iOS App Development'), (SELECT skill_tag_id FROM skill_tags WHERE name = 'iOS'));


CREATE TABLE "SequelizeMeta" (
    name VARCHAR(255) PRIMARY KEY
);

SELECT * FROM "users";
SELECT * FROM "projects";
CREATE TYPE contract_status_enum AS ENUM ('active', 'completed', 'cancelled', 'pending');
SELECT * FROM "contracts";
SELECT * FROM "proposals";
SELECT * FROM "messages";
INSERT INTO proposals (
    proposal_id,
    project_id,
    freelancer_id,
    cover_letter,
    proposed_price,
    estimated_completion_days,
    status
)
VALUES (
    '00000000-0000-0000-0000-000000000000', -- proposal_id
    'ad642fdb-8d95-4468-bb5a-a11f88107552', -- project_id
    'b04998d3-05a1-4201-ac94-d5535b7d1a5d', -- freelancer_id
    'Default cover letter',                 -- cover_letter
    100,                                    -- proposed_price
    7,                                      -- estimated_completion_days
    'pending'                               -- status
);
ALTER TABLE contracts ALTER COLUMN proposal_id DROP NOT NULL;
UPDATE users SET is_active = true WHERE username = 'john_doe';
SELECT * FROM users WHERE username = 'john_doe';
ALTER TABLE projects ADD COLUMN freelancer_id UUID REFERENCES users(user_id);
ALTER TABLE projects ADD COLUMN completed_at TIMESTAMP;

CREATE TABLE project_files (
  file_id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(project_id),
  filename VARCHAR(255) NOT NULL,
  originalname VARCHAR(255) NOT NULL,
  path TEXT NOT NULL,
  size INTEGER NOT NULL,
  mimetype VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_project_files_project_id ON project_files(project_id);
