#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(__dirname, 'posts');
const POSTS_PER_PAGE = 10; // Client-side pagination

// Read all post directories
function getAllPosts() {
    const dirs = fs.readdirSync(POSTS_DIR)
        .filter(name => name.match(/^\d{4}-\d{2}-\d{2}-/));

    const posts = dirs.map(dir => {
        const metaPath = path.join(POSTS_DIR, dir, 'meta.json');
        if (!fs.existsSync(metaPath)) {
            console.warn(`Warning: No meta.json found for ${dir}`);
            return null;
        }
        
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        return {
            slug: dir,
            ...meta
        };
    }).filter(Boolean);

    // Sort by actual date from meta.json, newest first
    return posts.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Generate post card HTML
function generatePostCard(post) {
    // Parse date as YYYY-MM-DD and format in local time to avoid timezone shifts
    const [year, month] = post.date.split('-');
    const formattedDate = new Date(year, month - 1, 1).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long'
    });

    return `        <a href="posts/${post.slug}/" class="post-card" data-post>
            <div class="post-title">${post.title}</div>
            <div class="post-date">${formattedDate}</div>
            <div class="post-excerpt">
                ${post.description || post.excerpt || ''}
            </div>
            <span class="read-more">Read more →</span>
        </a>`;
}

// Generate index.html (single page with all posts, JS pagination)
function generateIndexPage(posts) {
    const postCardsHtml = posts.map(generatePostCard).join('\n\n');
    const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Data-driven analysis of economic indicators, financial systems, and power structures. Testing recession prediction frameworks, analyzing central bank policy, mapping global influence networks, and reverse-engineering economic models using real-world data.">
    <title>Understanding Systems - Data-Driven Analysis</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            max-width: 900px;
            margin: 0 auto;
            padding: 60px 20px;
            background: white;
            color: #333;
        }
        h1 {
            color: #1a1a1a;
            font-size: 2.5em;
            margin-bottom: 0.3em;
            font-weight: 600;
            letter-spacing: -0.02em;
        }
        .tagline {
            color: #666;
            font-size: 1.1em;
            margin-bottom: 3em;
        }
        .posts {
            display: grid;
            gap: 40px;
            margin-top: 50px;
        }
        .post-card {
            border: 1px solid #e5e5e5;
            border-radius: 4px;
            padding: 30px;
            background: white;
            text-decoration: none;
            color: inherit;
            display: block;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .post-card:hover {
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
        .post-card.hidden {
            display: none;
        }
        .post-title {
            color: #1a1a1a;
            font-size: 1.6em;
            font-weight: 600;
            margin-bottom: 0.3em;
        }
        .post-date {
            color: #999;
            font-size: 0.9em;
            margin-bottom: 1em;
        }
        .post-excerpt {
            color: #555;
            line-height: 1.6;
        }
        .read-more {
            color: #0066cc;
            font-weight: 500;
            margin-top: 15px;
            display: inline-block;
        }
        .post-card:hover .read-more {
            text-decoration: underline;
        }
        .pagination {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 60px;
            padding: 20px 0;
            border-top: 1px solid #e5e5e5;
        }
        .page-link {
            color: #333;
            text-decoration: none;
            padding: 10px 20px;
            border: 1px solid #e5e5e5;
            border-radius: 4px;
            cursor: pointer;
            background: none;
        }
        .page-link:hover:not(.disabled) {
            background: #f5f5f5;
        }
        .page-link.disabled {
            color: #ccc;
            cursor: not-allowed;
        }
        .page-info {
            color: #666;
        }
        footer {
            margin-top: 60px;
            padding-top: 30px;
            border-top: 1px solid #e5e5e5;
            color: #999;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <h1>Understanding Systems</h1>
    <p class="tagline">Exploring how the world works through data, networks, and influence</p>
    
    <div class="posts">
${postCardsHtml}
    </div>

    <div class="pagination">
        <button class="page-link" id="prevPage">← Newer</button>
        <span class="page-info" id="pageInfo">Page 1 of ${totalPages}</span>
        <button class="page-link" id="nextPage">Older →</button>
    </div>

    <footer>
        <p><a href="about.html">About this blog</a></p>
        <p>Last updated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</p>
    </footer>

    <script>
        const POSTS_PER_PAGE = ${POSTS_PER_PAGE};
        const posts = Array.from(document.querySelectorAll('[data-post]'));
        const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE);
        let currentPage = 1;

        function showPage(page) {
            currentPage = page;
            const start = (page - 1) * POSTS_PER_PAGE;
            const end = start + POSTS_PER_PAGE;

            posts.forEach((post, index) => {
                if (index >= start && index < end) {
                    post.classList.remove('hidden');
                } else {
                    post.classList.add('hidden');
                }
            });

            document.getElementById('pageInfo').textContent = \`Page \${page} of \${totalPages}\`;
            
            const prevBtn = document.getElementById('prevPage');
            const nextBtn = document.getElementById('nextPage');
            
            if (page === 1) {
                prevBtn.classList.add('disabled');
            } else {
                prevBtn.classList.remove('disabled');
            }

            if (page === totalPages) {
                nextBtn.classList.add('disabled');
            } else {
                nextBtn.classList.remove('disabled');
            }

            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        document.getElementById('prevPage').addEventListener('click', () => {
            if (currentPage > 1) showPage(currentPage - 1);
        });

        document.getElementById('nextPage').addEventListener('click', () => {
            if (currentPage < totalPages) showPage(currentPage + 1);
        });

        // Initialize
        showPage(1);
    </script>
</body>
</html>
`;

    return html;
}

// Main execution
function main() {
    console.log('Generating blog index page...\n');
    
    const posts = getAllPosts();
    console.log(`Found ${posts.length} posts`);
    
    const html = generateIndexPage(posts);
    fs.writeFileSync(path.join(__dirname, 'index.html'), html);
    console.log('✓ Generated index.html with client-side pagination');
    
    console.log('\nDone!');
}

main();
