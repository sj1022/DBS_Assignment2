const db = require('../config/db');

const getCategoriesPage = async (req, res, next) => {
    try {
        /*
            TODO: 모든 카테고리를 출력하는 페이지를 렌더링하는 코드를 작성하세요.
        */
        const sql = 
            `SELECT c.category_id as id, c.category_name as name,
                COUNT(bc.booktype_id) as book_count
            FROM Category c 
            LEFT JOIN Bookcategory bc ON c.category_id = bc.category_id
            GROUP BY c.category_id, c.category_name
            ORDER BY c.category_name
            `;
        const [categories] = await db.query(query);
        res.render('pages/categories', {
            title: 'Category Management',
            categories: categories // 카테고리 리스트가 전달되어야 합니다.
        });
    } catch (err) {
        next(err);
    }
};

const postDeleteCategory = async (req, res, next) => {
    const categoryId = Number(req.params.id);
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();        
        /*
            TODO: 카테고리를 제거하는 코드를 작성하세요.
            만약 해당 카테고리에 포함된 책이 있다면 책에서 해당 카테고리만 지우고 나머지 카테고리는 유지하면 됩니다.
        */
        // Bookcategory에서 해당 카테고리 정보 삭제
        await connection.query(
            'DELETE FROM Bookcategory WHERE category_id = ?',
            [categoryId]
        );
        // Category 테이블에서 해당 카테고리 삭제
        await connection.query(
            'DELETE FROM Category WHERE category_id = ?',
            [categoryId]
        );
        await connection.commit();        
        res.redirect('/categories');
    } catch (err) {
        await connection.rollback();
        next(err);
    } finally {
        connection.release();
    }
};

module.exports = {
    getCategoriesPage,
    postDeleteCategory
};