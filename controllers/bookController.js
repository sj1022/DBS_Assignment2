const db = require('../config/db');

const getBooksPage = async (req, res, next) => {
    const { query: searchQuery, searchBy, sortedBy, sortOrder } = req.query;
    const sortedByWithDefault = req.query.sortBy || 'title';
    const sortOrderWithDefault = req.query.sortOrder || 'asc';

    try {
        /*
            TODO: 검색어, 정렬 기준에 맞춰 책 목록을 출력하는 페이지를 렌더링하는 코드를 작성하세요.
        */
        const columns = ['title', 'author'];
        const orders = ['asc', 'desc'];

        let sql = `
            SELECT 
                bt.booktype_id AS id,
                bt.title,
                bt.author,
                GROUP_CONCAT(DISTINCT c.category_name SEPARATOR ', ') AS categories,
                COUNT(DISTINCT b.book_id) AS total,
                (SELECT COUNT(*) FROM Book b1 WHERE b1.booktype_id = bt.booktype_id) AS total_quantity,
                (SELECT COUNT(*) FROM Book b2 WHERE b2.booktype_id = bt.booktype_id AND b2.status = 'available') AS available_quantity
            FROM Booktype bt
            LEFT JOIN Book b ON bt.booktype_id = b.booktype_id
            LEFT JOIN Bookcategory bc ON bt.booktype_id = bc.booktype_id
            LEFT JOIN Category c ON bc.category_id = c.category_id
        `;
        let params = []; 

        if (searchQuery && searchQuery.trim() !== '') {
            if (searchBy === 'category') { //카테고리로 검색할 경우
                sql += ` WHERE c.category_name LIKE ?`;
            } else if (columns.includes(searchBy)) {// title이나 author로 검색
                sql += ` WHERE bt.${searchBy} LIKE ?`;
            }
            params.push(`%${searchQuery.trim()}%`);
        }

        sql += ` GROUP BY bt.booktype_id, bt.title, bt.author`;

        if (sortedByWithDefault === 'categories' && orders.includes(sortOrderWithDefault)) {
            sql += ` ORDER BY categories ${sortOrderWithDefault.toUpperCase()}`;
        } else if (columns.includes(sortedByWithDefault) && orders.includes(sortOrderWithDefault)) {
            sql += ` ORDER BY bt.${sortedByWithDefault} ${sortOrderWithDefault.toUpperCase()}`;
        } else {
            sql += ' ORDER BY bt.title ASC';
        }

        const [books] = await db.query(sql, params);
       
        res.render('pages/books', {
            title: 'All Books',
            books: books, // 정렬된 검색 결과 리스트가 전달되어야 합니다.
            sortBy: sortedByWithDefault,
            sortOrder: sortOrderWithDefault,
            query: searchQuery,
            searchBy: searchBy
        });
    } catch (err) {
        next(err);
    }
};


const getAddBookPage = async (req, res, next) => {
    try {
        /*
            TODO: 책을 추가하는 페이지를 렌더링 하는 코드를 작성하세요.
            책 추가 시 작가와 카테고리를 선택해야하므로 현재 카테고리 목록과 작가 목록을 불러와야 합니다.
        */
        const [categories] = await db.query( //현재 카테고리 목록
            'SELECT category_id AS id, category_name AS name FROM Category ORDER BY category_name'
        )

        const [authors] = await db.query( //현재 작가 목록
            'SELECT DISTINCT author AS name FROM Booktype ORDER BY author'
        );

        res.render('pages/add-book', {
            title: 'Add New Book',
            categories: categories, // 카테고리 리스트가 전달되어야 합니다.
            authors: authors, // 저자 리스트가 전달되어야 합니다.
        });
    } catch (err) {
        next(err);
    }
};


const postAddBook = async (req, res, next) => {
    const { title, authors, quantity, categories } = req.body;

    const connection = await db.pool.getConnection();

    try {
        /*
            TODO: 책을 DB에 추가하는 작업을 수행하는 코드를 작성하세요.
            기존에 없는 카테고리와 저자 또한 추가해줘야 합니다.
        */
        await connection.beginTransaction(); //transaction 시작 -> 추가 도중 오류 발생 시 이미 추가했던 것도 다시 빼야함.
        
        //Booktype 추가 로직
        let booktypeId;

        const [existingBooktype] = await connection.query( //이미 booktype이 존재하는 책인지 확인
            'SELECT booktype_id FROM Booktype WHERE title = ? AND author = ?',
            [title, authors]
        );

        if (existingBooktype.length > 0) {
            booktypeId = existingBooktype[0].booktype_id;
        } else {
            //새로운 책 종류인 경우에만 Booktype 추가
            const [booktype] = await connection.query(
                'INSERT INTO Booktype (title, author) VALUES (?, ?)',
                [title, authors]
            );
            booktypeId = booktype.insertId; //방금 추가된 booktype_id
        }

        //Book 추가 로직 -> 물리적 책은 무조건 수량만큼 추가
        for (let i=0; i<parseInt(quantity); i++) {
            await connection.query (
                'INSERT INTO Book (booktype_id, status) VALUES (?, ?)',
                [booktypeId, 'available']
            );
        }

        //Category 추가 로직
        if (categories) {
            for (const categoryName of categories) {
                if (!categoryName || categoryName.trim() === '') continue;  //empty 값이 들어올 경우 아무것도 안 함.

                const [existingCategory] = await connection.query(
                    'SELECT category_id FROM Category WHERE category_name = ?',
                    [categoryName.trim()]
                );

                let categoryId;

                if (existingCategory.length > 0) { //이미 존재하는 카테고리 
                    categoryId = existingCategory[0].category_id;
                } else { //새로운 카테고리 -> Category에 새롭게 추가해줘야 함
                    const [newCategory] = await connection.query(
                        'INSERT INTO Category (category_name) VALUES (?)',
                        [categoryName.trim()]
                    );
                    categoryId = newCategory.insertId;
                }

                const [existingLink] = await connection.query(
                    'SELECT * FROM Bookcategory WHERE booktype_id = ? AND category_id = ?',
                    [booktypeId, categoryId]
                );
                if (existingLink.length === 0) { //Bookcategory에 추가가 안 된 경우에만 추가해 줌
                    await connection.query(
                        'INSERT INTO Bookcategory (booktype_id, category_id) VALUES (?, ?)',
                        [booktypeId, categoryId]
                    );
                }
            }
        }

        await connection.commit();
        res.redirect('/books');
    } catch (err) {
        await connection.rollback();
        next(err);
    } finally {
        connection.release(); 
    }
};


const postDeleteBookInstance = async (req, res, next) => {
    const bookInstanceId = Number(req.params.id);

    const connection = await db.pool.getConnection();

    try {
        await connection.beginTransaction();
        /*
            TODO: 책 한 권을 제거하는 작업을 수행하는 코드를 작성하세요.
            동일한 책을 모두 제거하면 해당 책에 대한 정보도 지워지도록 구현해주세요.
        */
        const [bookinstance] = await connection.query(
            'SELECT booktype_id, status FROM Book WHERE book_id = ?', [bookInstanceId]
        );

        if (bookinstance.length === 0) {
            const err = new Error('Already non-exist book');
            return next(err);
        }

        const booktypeId = bookinstance[0].booktype_id;
        const bookStatus = bookinstance[0].status;

        //대출 중인 책은 삭제 불가  
        if (bookStatus === 'borrowed') {
            const err = new Error('Cannot delete a borrowed book. Please return it first.');
            err.status = 400;
            throw err;
        }

        await connection.query(
            'DELETE FROM Book WHERE book_id = ?', [bookInstanceId]
        );

        //해당 Booktype의 물리적 책이 존재하는 지 확인
        const [remaining] = await connection.query(
            'SELECT COUNT(*) AS cnt FROM Book WHERE booktype_id = ?', [booktypeId]
        );

        //동일한 책이 모두 제거됐으므로 메타데이터도 지워야 함.
        if(remaining[0].cnt === 0) {
            await connection.query('DELETE FROM Bookcategory WHERE booktype_id = ?', [booktypeId]);
            await connection.query('DELETE FROM Booktype WHERE booktype_id = ?', [booktypeId]);
        }

        await connection.commit();
        res.redirect('/books');
    } catch (err) {
        await connection.rollback();
        next(err);
    } finally {
        connection.release();
    }
};


const postBorrowBook = async (req, res, next) => {
    const bookInstanceId = Number(req.params.id);
    const userId = req.session.user_id;

    if (!userId) {
        return res.redirect('/login');
    }

    const connection = await db.pool.getConnection();

    try {
        await connection.beginTransaction();
        /*
            TODO: 특정 책을 대여하는 작업을 수행하는 코드를 작성하세요.
            명세에 있는 조건들을 어기는 작업일 경우에는 다음과 같이 에러페이지로 유도하면 됩니다.

            ```
                const err = new Error('You have reached the maximum borrowing limit (3 books).');
                err.status = 400;
                return next(err);
            ```
        */

        //블랙리스트 로직
        const [blacklist] = await connection.query(
            'SELECT * FROM Blacklist WHERE user_id = ? AND end_date >= CURDATE() ', [userId]
        );

        if (blacklist.length > 0) {
            const err = new Error('Yor are blacklisted now.');
            err.status = 400;
            throw err;
        }

        //연체 확인 로직
        const [overdue] = await connection.query(
            `SELECT COUNT(*) as cnt 
            FROM Loan 
            WHERE user_id = ? AND return_date is NULL AND due_date < CURDATE()`,
            [userId]
        )

        if (overdue[0].cnt > 0) {
            const err = new Error('Yor should return the overdued book first.');
            err.status = 400;
            throw err;
        }

        //일반 대출 로직
        //대출 중인 책 개수 체크
        const [currentLoans] = await connection.query(
            `SELECT COUNT(*) as cnt FROM Loan 
             WHERE user_id = ? AND return_date IS NULL`,
            [userId]
        );

        //이미 3권 대출 중인 상태
        if (currentLoans[0].cnt >= 3) {
            const err = new Error('You have reached the maximum borrowing limit (3 books).');
            err.status = 400;
            throw err;
        }

        //해당 책의 대출 상태 확인
        const [books] = await connection.query(
            `SELECT * FROM Book WHERE book_id = ? AND status = 'available'`,
            [bookInstanceId]
        );

        //모든 책이 대출 중
        if (books.length === 0) {
            const err = new Error('This book is not available for borrowing.');
            err.status = 400;
            throw err;
        }

        //동일한 책 대출 여부 확인
        const [sameBooktype] = await connection.query(
            `SELECT l.* 
             FROM Loan l
             JOIN Book b ON l.book_id = b.book_id
             WHERE l.user_id = ? AND l.return_date IS NULL AND b.booktype_id = ?`,
            [userId, books[0].booktype_id]
        );

        //동일한 Booktype 대출 중
        if (sameBooktype.length > 0) {
            const err = new Error('You have already borrowed same book.');
            err.status = 400;
            throw err;
        }

        //대출 가능 시 대출 해주기
        const loanDate = new Date();
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7); //반납일은 7일 후로 설정

        await connection.query(
            `INSERT INTO Loan (user_id, book_id, loan_date, due_date) 
             VALUES (?, ?, ?, ?)`,
            [userId, bookInstanceId, loanDate, dueDate]
        );

        //편의를 위해 status를 중복돼서 존재하게 했으므로 동기화 필요
        await connection.query(
            `UPDATE Book SET status = 'borrowed' WHERE book_id = ?`,
            [bookInstanceId]
        );

        await connection.commit();

        res.redirect('/books');
    } catch (err) {
        await connection.rollback();
        next(err);
    } finally {
        connection.release();
    }
};


const postReturnBook = async (req, res, next) => {
    const borrowingId = Number(req.params.id);
    const userId = req.session.user_id;

    if (!userId) {
        return res.redirect('/login');
    }

    const connection = await db.pool.getConnection();

    try {
        await connection.beginTransaction();
        /*
            TODO: 자신이 책을 빌린 기록을 반납 처리하는 코드를 작성해주세요.
            다른 사람이 빌린 책은 반납할 수 없어야 합니다.
        */

        //해당 사용자가 빌린 책이 맞는지 확인
        const [loan] = await connection.query(
            `SELECT * FROM Loan WHERE loan_id = ? AND user_id = ?`,
            [borrowingId, userId]
        );
        //해당 사용자가 빌린 책이 아님
        if (loan.length === 0) {
            const err = new Error('You can only return books you borrowed.');
            err.status = 400;
            throw err;
        }

        //이미 반납된 책이 아닌지 확인
        if (loan[0].return_date !== null) {
            const err = new Error('This book has already been returned.');
            err.status = 400;
            throw err;
        }

        //연체 여부 확인
        const returnDate = new Date();
        const dueDate = new Date(loan[0].due_date);
        const isOverdue = returnDate > dueDate;

        //반납 가능하다면 반납하기
        await connection.query(
            `UPDATE Loan SET return_date = ? WHERE loan_id = ?`,
            [returnDate, borrowingId]
        );

        //status 별도 처리
        await connection.query(
            `UPDATE Book SET status = 'available' WHERE book_id = ?` ,
            [loan[0].book_id]
        );

        //연체자 처리
        if (isOverdue) {
            //연체자의 연체 횟수 증가
            await connection.query(
                `UPDATE User SET overdue_cnt = overdue_cnt + 1 
                WHERE user_id = ?`,
                [userId]
            );

            //블랙리스트 처리
            const[user] = await connection.query(
                'SELECT overdue_cnt FROM User WHERE user_id = ?', [userId]
            );

            //3회 초과 시 블랙리스트 등록 
            if (user[0].overdue_cnt > 3) {
                const startDate = returnDate;
                const endDate = new Date(returnDate);
                endDate.setDate(endDate.getDate() + 30); //반납일로부터 30일

                await connection.query(
                    `INSERT INTO Blacklist (user_id, start_date, end_date) 
                     VALUES (?, ?, ?)`,
                    [userId, startDate, endDate]
                );
            }
        }

        await connection.commit();

        res.redirect('/borrowings');
    } catch (err) {
        await connection.rollback();
        next(err);
    } finally {
        connection.release();
    }
};


const getBookInstances = async (req, res, next) => {
    const bookId = Number(req.params.id);
    try {
        /*
            TODO: 특정 동일한 책의 개별 리스트를 불러오는 코드를 작성해주세요.
        */
        const [booklists] = await db.query(
            `SELECT b.book_id as id, b.booktype_id as book_id, l.loan_id as borrowing_id, 
            l.user_id as borrowed_by, DATE_FORMAT(l.loan_date, '%Y.%m.%d') as borrow_date, b.status as status
            FROM Book b
            LEFT JOIN Loan l ON (b.book_id = l.book_id AND l.return_date IS NULL)
            WHERE b.booktype_id = ? 
            ORDER BY b.book_id`,
            [bookId]
        );
        res.json(booklists);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getBooksPage,
    getAddBookPage,
    postAddBook,
    postDeleteBookInstance,
    postBorrowBook,
    postReturnBook,
    getBookInstances
};