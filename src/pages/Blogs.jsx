// src/pages/Blogs.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { blogAPI } from '../api/blog';
import Sidebar from '../components/Sidebar';
import ConfirmationModal from '../components/ConfirmationModal';

const Blogs = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteModal, setDeleteModal] = useState({
    show: false,
    id: null,
    title: ''
  });
  
  const navigate = useNavigate();

  // Fetch ALL blogs - NO FILTERS
  const fetchBlogs = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Just get all blogs without any filters
      const response = await blogAPI.getAllBlogs({});
      
      console.log('Blogs from API:', response.data.data);
      
      setBlogs(response.data.data || []);
    } catch (err) {
      console.error('Error fetching blogs:', err);
      setError('Failed to fetch blogs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  // Delete blog function
  const handleDelete = async (blogId, blogTitle) => {
    if (!blogId) return;
    
    try {
      console.log('Deleting blog with ID:', blogId);
      await blogAPI.deleteBlog(blogId);
      
      // Remove from state
      setBlogs(prevBlogs => prevBlogs.filter(blog => blog._id !== blogId));
      
      // Close modal
      setDeleteModal({ show: false, id: null, title: '' });
      
      // Show success message
      setError(''); // Clear any previous errors
      
    } catch (err) {
      console.error('Delete error:', err);
      setError(err.response?.data?.message || 'Failed to delete blog');
      setDeleteModal({ show: false, id: null, title: '' });
    }
  };



  // Handle create new blog
  const handleCreateNew = () => {
    navigate('/blogs/create');
  };

  return (
    <div className="flex">
      <Sidebar />
      
      <div className="flex-1 p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Blog Posts</h1>
            <p className="text-gray-600">Manage all blog posts</p>
          </div>
          <button
            onClick={handleCreateNew}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <span>+</span> Create New Post
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className={`mb-4 p-3 rounded ${error.includes('Failed') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {error}
          </div>
        )}

        {/* Simple refresh button */}
        <div className="mb-4">
          <button
            onClick={fetchBlogs}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh List
          </button>
        </div>

        {/* Blogs Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              <p className="mt-2 text-gray-600">Loading blogs...</p>
            </div>
          ) : blogs.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">No blogs found in database. Create your first blog post!</p>
            </div>
          ) : (
            <>
              <div className="p-4 border-b">
                <p className="text-sm text-gray-600">
                  Showing {blogs.length} blog{blogs.length !== 1 ? 's' : ''}
                </p>
              </div>
              
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Blog Post
                    </th>
                
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {blogs.map((blog) => (
                    <tr key={blog._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                       <div className="flex-shrink-0 h-12 w-12">
  {blog.image && (
    <img
      className="h-12 w-12 rounded-lg object-cover"
      src={`${import.meta.env.VITE_API_FILE_URL || 'http://localhost:5002'}/uploads/${blog.image}`}
      alt={blog.imageAlt || blog.title}
      onError={(e) => {
        console.error('❌ Image failed:', blog.image);
        console.error('Full URL:', e.target.src);
        e.target.onerror = null;
        e.target.src = 'https://via.placeholder.com/150';
      }}
      onLoad={() => console.log('✅ Image loaded successfully')}
    />
  )}
</div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {blog.title}
                            </div>
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {blog.description}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              ID: {blog._id.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
              
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(blog.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(blog.createdAt).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/blogs/edit/${blog._id}`}
                            className="text-blue-600 hover:text-blue-900 px-2 py-1"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => {
                              console.log('Delete button clicked for:', blog.title);
                              setDeleteModal({
                                show: true,
                                id: blog._id,
                                title: blog.title || 'Untitled Blog'
                              });
                            }}
                            className="text-red-600 hover:text-red-900 px-2 py-1"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={deleteModal.show}
          onClose={() => setDeleteModal({ show: false, id: null, title: '' })}
          onConfirm={() => handleDelete(deleteModal.id, deleteModal.title)}
          title="Delete Blog Post"
          message={`Are you sure you want to delete "${deleteModal.title}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />
      </div>
    </div>
  );
};

export default Blogs;