const db = require('../config/db');

const getChartsPage = async (req, res, next) => {
    let selectedCategoryId = req.query.categoryId ? Number(req.query.categoryId) : null;
    let userId = req.session.user_id; //사용자 연령대에 맞는 차트 제공을 위함

    try {
        /*
            TODO: 차트 페이지를 렌더링하는 코드를 작성하세요.
        */
        // 모든 카테고리 정보
        const [categories] = await db.query(
            `SELECT category_id as id, category_name as name
            FROM Category
            ORDER BY category_name`
        );
        //전체 도서 인기차트 로직
        const [popularBooks] = await db.query(`
            SELECT 
                bt.title as title, bt.author as author,
                GROUP_CONCAT(DISTINCT c.category_name ORDER BY c.category_name SEPARATOR ', ') as categories,
                COUNT(l.loan_id) as borrow_count
            FROM Loan l
            JOIN Book b ON l.book_id = b.book_id
            JOIN Booktype bt ON b.booktype_id = bt.booktype_id
            LEFT JOIN Bookcategory bc ON bt.booktype_id = bc.booktype_id
            LEFT JOIN Category c ON bc.category_id = c.category_id
            WHERE l.loan_date >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
            GROUP BY bt.booktype_id, bt.title, bt.author
            ORDER BY borrow_count DESC
            LIMIT 10`
        );

        //카테고리별 인기차트 로직
        let popularBooksByCategory = {};
        if (selectedCategoryId) {
            const [categoryBooks] = await db.query(`
                SELECT 
                bt.title as title, bt.author as author,
                GROUP_CONCAT(DISTINCT c.category_name ORDER BY c.category_name SEPARATOR ', ') as categories,
                COUNT(l.loan_id) as borrow_count
                FROM Loan l
                JOIN Book b ON l.book_id = b.book_id
                JOIN Booktype bt ON b.booktype_id = bt.booktype_id
                JOIN Bookcategory bc ON bt.booktype_id = bc.booktype_id
                LEFT JOIN Category c ON bc.category_id = c.category_id
                WHERE l.loan_date >= DATE_SUB(NOW(), INTERVAL 3 MONTH) 
                    AND c.category_id = ?
                GROUP BY bt.booktype_id, bt.title, bt.author
                ORDER BY borrow_count DESC
                LIMIT 10`, 
                [selectedCategoryId]
            );

            const selectedCategory = categories.find(cat => cat.id === selectedCategoryId);
            if (selectedCategory) {
                popularBooksByCategory[selectedCategory.name] = categoryBooks;
            }
        }

        //연령대별 인기 차트 로직
        let ageGroupBooks = null;
        if (userId) {
            //로그인한 사용자 정보
            const [userInfo] = await db.query(`SELECT birth_year FROM User WHERE user_id = ?`, [userId]);

            if (userInfo.length > 0 && userInfo[0].birth_year) {
                const currentYear = new Date().getFullYear();
                const age = currentYear - userInfo[0].birth_year + 1;
                const ageGroup = Math.floor(age / 10) * 10; //연령대 계산
                
                //booktype 기준 borrow_count를 집계 ->  통계 기능
                //이때 borrow_count는 사용자와 연령대가 동일
                const [ageBooks] = await db.query(`
                    SELECT 
                        bt.title as title, bt.author as author,
                        GROUP_CONCAT(DISTINCT c.category_name ORDER BY c.category_name SEPARATOR ', ') as categories,
                        COUNT(l.loan_id) as borrow_count
                    FROM Loan l
                    JOIN Book b ON l.book_id = b.book_id
                    JOIN Booktype bt ON b.booktype_id = bt.booktype_id
                    LEFT JOIN Bookcategory bc ON bt.booktype_id = bc.booktype_id
                    LEFT JOIN Category c ON bc.category_id = c.category_id
                    JOIN User u ON l.user_id = u.user_id
                    WHERE l.loan_date >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
                        AND FLOOR(((? - u.birth_year) + 1 ) / 10) * 10 = ?
                    GROUP BY bt.booktype_id, bt.title, bt.author
                    ORDER BY borrow_count DESC
                    LIMIT 10
                `, [currentYear, ageGroup]);

                ageGroupBooks = {
                    ageGroup: `${ageGroup}s`,
                    books: ageBooks
                };
            }
        }

        res.render('pages/charts', {
            title: 'Charts',
            popularBooks: popularBooks,
            popularBooksByCategory: popularBooksByCategory,
            categories: categories,
            selectedCategoryId,
            ageGroupBooks
        });

    } catch (err) {
        next(err);
    }
};

module.exports = {
    getChartsPage
};