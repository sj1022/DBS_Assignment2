const db = require('../config/db');

const initDB = async () => {
    try {
        // Drop existing tables in the correct order
        console.log('Deleting existing tables...');
        // TODO: 기존 테이블 제거하는 코드를 작성하세요.
        await db.query('DROP TABLE IF EXISTS Loan');
        await db.query('DROP TABLE IF EXISTS Bookcategory');
        await db.query('DROP TABLE IF EXISTS Book');
        await db.query('DROP TABLE IF EXISTS Booktype;');
        await db.query('DROP TABLE IF EXISTS Category;');
        await db.query('DROP TABLE IF EXISTS Blacklist;');
        await db.query('DROP TABLE IF EXISTS User;');

        // Create tables
        console.log('Creating new tables...');
        // TODO: 설계한 스키마에 맞춰 새로운 테이블을 생성하는 코드를 작성하세요.
        await db.query(`
            CREATE TABLE User (
                user_id VARCHAR(50) PRIMARY KEY,
                password VARCHAR(255) NOT NULL,
                birth_year INT NOT NULL,
                role ENUM('user', 'admin') DEFAULT 'user',
                overdue_cnt INT DEFAULT 0
            )
        `);

        await db.query(`
            CREATE TABLE Blacklist (
                blacklist_id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(50) NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                FOREIGN KEY (user_id) REFERENCES User(user_id) ON DELETE CASCADE
            )
        `);

        await db.query(`
            CREATE TABLE Category (
                category_id INT AUTO_INCREMENT PRIMARY KEY,
                category_name VARCHAR(100) NOT NULL
            )
        `);

        await db.query(`
            CREATE TABLE Booktype (
                booktype_id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                author VARCHAR(100) NOT NULL
            )
        `);

        await db.query(`
            CREATE TABLE Book (
                book_id INT AUTO_INCREMENT PRIMARY KEY,
                booktype_id INT NOT NULL,
                status ENUM('available', 'borrowed') DEFAULT 'available',
                FOREIGN KEY (booktype_id) REFERENCES Booktype(booktype_id) ON DELETE CASCADE
            )
        `);

        await db.query(`
            CREATE TABLE Bookcategory (
                booktype_id INT NOT NULL,
                category_id INT NOT NULL,
                PRIMARY KEY (booktype_id, category_id),
                FOREIGN KEY (booktype_id) REFERENCES Booktype(booktype_id) ON DELETE CASCADE,
                FOREIGN KEY (category_id) REFERENCES Category(category_id) ON DELETE CASCADE
            )
        `);

        await db.query(`
            CREATE TABLE Loan (
                loan_id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(50) NOT NULL,
                book_id INT NOT NULL,
                loan_date DATE NOT NULL,
                due_date DATE NOT NULL,
                return_date DATE,
                FOREIGN KEY (user_id) REFERENCES User(user_id) ON DELETE CASCADE,
                FOREIGN KEY (book_id) REFERENCES Book(book_id) ON DELETE CASCADE
            )
        `);

        console.log('Inserting existing books...');
        
        await db.query(`
            INSERT INTO Category (category_name) VALUES
            ('Fiction'),
            ('Science'),
            ('History'),
            ('Philosophy'),
            ('Computer')
        `);

        await db.query(`
            INSERT INTO Booktype (title, author) VALUES
            ('1984', 'George Owell'),
            ('Cosmos', 'Carl Sagan'),
            ('Sapiens', 'Yuval Harari'),
            ('Being and Time', 'Martin Heidegger'),
            ('Clean Code', 'Robert C. Martin')
        `);

        await db.query(`
            INSERT INTO Book (booktype_id, status) VALUES
            (1, 'available'),
            (2, 'available'),
            (3, 'available'),
            (4, 'available'),
            (5, 'available')
        `);

        await db.query(`
            INSERT INTO Bookcategory (booktype_id, category_id) VALUES
            (1, 1),
            (2, 2),
            (3, 3), (3, 2),
            (4, 4),
            (5, 5)
        `);

        console.log('Database initialization completed successfully.');
    } catch (err) {
        console.error('Database initialization failed:', err);
    } finally {
        db.pool.end();
    }
};

initDB();