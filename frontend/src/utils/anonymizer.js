/**
 * Formats comments and assigns consistent pseudonyms when anonymization is active.
 * @param {Array<{ id: string, author: string, date: string, text: string }>} comments 
 * @param {boolean} isAnonymized 
 * @returns {Array<{ no: number, id: string, author: string, date: string, text: string }>}
 */
export function anonymizeComments(comments, isAnonymized = false) {
  if (!Array.isArray(comments) || comments.length === 0) {
    return [];
  }

  const authorMap = new Map();
  let counter = 1;

  return comments.map((c, index) => {
    const rawAuthor = c.author || 'Unknown';
    let displayAuthor = rawAuthor;

    if (isAnonymized) {
      if (!authorMap.has(rawAuthor)) {
        authorMap.set(rawAuthor, `Commenter #${counter++}`);
      }
      displayAuthor = authorMap.get(rawAuthor);
    }

    return {
      no: index + 1,
      id: c.id || `cmt-${index + 1}`,
      author: displayAuthor,
      date: c.date || 'Recent',
      text: c.text || ''
    };
  });
}
