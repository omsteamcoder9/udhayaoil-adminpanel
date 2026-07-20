// src/pages/Categories.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import AddCategoryModal from '../components/AddCategoryModal';
import EditCategoryModal from '../components/EditCategoryModal';
import { categoriesAPI } from '../api/categories';
import { FaEdit, FaTrash, FaPlus, FaSignOutAlt, FaSyncAlt, FaSearch, FaFilter } from 'react-icons/fa';

const Categories = () => {
  const { user, logout, isAdmin } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' or 'oldest'

  // Fetch categories from API
  const fetchCategories = async (showRefreshingState = false) => {
    try {
      if (showRefreshingState) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const response = await categoriesAPI.getAllCategories();
      
      let categoriesArray = [];
      const data = response.data;
      
      if (Array.isArray(data)) {
        categoriesArray = data;
      } else if (data.data && Array.isArray(data.data)) {
        categoriesArray = data.data;
      } else if (data.categories && Array.isArray(data.categories)) {
        categoriesArray = data.categories;
      } else {
        throw new Error('Unexpected response format');
      }

      setCategories(categoriesArray);
      setFilteredCategories(categoriesArray);
      setError('');
    } catch (error) {
      console.error('Error fetching categories:', error);
      setError(error.message || 'Failed to load categories');
      setCategories([]);
      setFilteredCategories([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Search and sort logic
  useEffect(() => {
    let results = [...categories];

    // Search filter
    if (searchTerm) {
      results = results.filter(category =>
        category.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.slug?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Sort by date (newest first or oldest first)
    results.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.updatedAt || 0);
      const dateB = new Date(b.createdAt || b.updatedAt || 0);
      
      if (sortOrder === 'newest') {
        return dateB - dateA; // Newest first
      } else {
        return dateA - dateB; // Oldest first
      }
    });

    setFilteredCategories(results);
  }, [searchTerm, sortOrder, categories]);

  // Handle manual refresh
  const handleRefresh = () => {
    fetchCategories(true);
  };

  const handleAddCategory = async (categoryData) => {
    try {
      const response = await categoriesAPI.createCategory(categoryData);
      const newCategories = [...categories, response.data.data];
      setCategories(newCategories);
      setFilteredCategories(newCategories);
      setIsModalOpen(false);
      setError('✅ Category added successfully!');
      setTimeout(() => setError(''), 3000);
    } catch (error) {
      console.error('Error adding category:', error);
      setError(error.response?.data?.message || 'Failed to add category');
    }
  };

  const handleEditCategory = async (categoryId, categoryData) => {
    try {
      const response = await categoriesAPI.updateCategory(categoryId, categoryData);
      const updatedCategories = categories.map(cat => 
        cat._id === categoryId ? response.data.data : cat
      );
      setCategories(updatedCategories);
      setFilteredCategories(updatedCategories);
      setIsEditModalOpen(false);
      setEditingCategory(null);
      setError('✅ Category updated successfully!');
      setTimeout(() => setError(''), 3000);
    } catch (error) {
      console.error('Error updating category:', error);
      setError(error.response?.data?.message || 'Failed to update category');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    
    try {
      await categoriesAPI.deleteCategory(id);
      const remainingCategories = categories.filter(cat => cat._id !== id);
      setCategories(remainingCategories);
      setFilteredCategories(remainingCategories);
      setError('✅ Category deleted successfully!');
      setTimeout(() => setError(''), 3000);
    } catch (error) {
      console.error('Error deleting category:', error);
      const errorMsg = error.response?.data?.message || 'Failed to delete category';
      setError(errorMsg);
    }
  };

  const openEditModal = (category) => {
    setEditingCategory(category);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditingCategory(null);
    setIsEditModalOpen(false);
  };

  const categoriesToRender = Array.isArray(filteredCategories) ? filteredCategories : [];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 w-full">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Left side: Only title */}
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-800">Categories Management</h1>
            </div>

            {/* Right side: Logout button */}
            <div className="flex items-center">
              {/* Logout Button */}
              <button
                onClick={logout}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2 rounded-lg transition duration-200 flex items-center"
                title="Logout"
              >
                <span className="hidden sm:inline mr-2">Logout</span>
                <FaSignOutAlt />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-4 sm:p-6">
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-700">
              All Categories ({categoriesToRender.length})
            </h2>
            <div className="flex space-x-2 sm:space-x-3 w-full sm:w-auto">
              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={loading || refreshing}
                className="flex-1 sm:flex-none bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center justify-center transition duration-200 text-sm min-h-[42px] disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh categories"
              >
                <FaSyncAlt className={`sm:mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </span>
              </button>
              
              {/* Add Category Button - Only for Admin */}
              {isAdmin && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex-1 sm:flex-none bg-gradient-to-r from-[#336600] to-[#2a5200] hover:from-[#2a5200] hover:to-[#1e3d00] text-white px-4 py-2 rounded-lg flex items-center justify-center transition duration-200 text-sm min-h-[42px]"
                >
                  <FaPlus className="sm:mr-2" />
                  <span className="hidden sm:inline">Add Category</span>
                  <span className="sm:hidden">Add</span>
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className={`px-4 py-3 rounded mb-4 text-sm ${
              error.includes('✅') 
                ? 'bg-green-50 border border-green-200 text-green-700' 
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {error}
            </div>
          )}

          {/* Search and Filter Section */}
          <div className="mb-6 bg-white rounded-xl p-3 md:p-4 border border-slate-200 shadow-sm">
            <div className="flex flex-col md:flex-row gap-3 md:gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search categories by name, slug, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 md:py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#336600] focus:border-transparent text-sm md:text-base"
                  />
                </div>
              </div>

              {/* Sort Filter */}
              <div className="flex items-center gap-2">
                <FaFilter className="text-slate-400 w-4 h-4" />
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="border border-slate-300 rounded-lg px-2 py-2 md:px-3 md:py-2.5 focus:outline-none focus:ring-2 focus:ring-[#336600] text-sm md:text-base w-full md:w-auto"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>
            </div>
          </div>

          {/* Categories Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#336600] mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading categories...</p>
              </div>
            ) : categoriesToRender.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">
                  <FaSearch className="w-12 h-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">No categories found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? 'Try adjusting your search' : 'No categories available'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* Desktop/Large Tablet View */}
                <table className="hidden md:table min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        S.No
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Slug
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      
                      {isAdmin && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                      </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {categoriesToRender.map((category, index) => (
                      <tr key={category._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900 text-center">
                            {index + 1}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {category.name}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-500">{category.slug}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-sm text-gray-500 max-w-xs truncate">
                            {category.description || 'No description'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                              category.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                              {category.status}
                          </span>
                        </td>
                      
                        {isAdmin && (
                          <td className="px-6 py-4">
                              <div className="flex space-x-2">
                              <button
                                  onClick={() => openEditModal(category)}
                                  className="bg-gradient-to-r from-[#336600] to-[#2a5200] hover:from-[#2a5200] hover:to-[#1e3d00] text-white px-3 py-2 rounded text-sm font-medium transition duration-200 flex items-center"
                              >
                                  Edit
                              </button>
                              <button
                                  onClick={() => handleDeleteCategory(category._id)}
                                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-3 py-2 rounded text-sm font-medium transition duration-200 flex items-center"
                              >
                                  Delete
                              </button>
                              </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile/Small Tablet View */}
                <div className="md:hidden">
                  <div className="divide-y divide-gray-200">
                    {categoriesToRender.map((category, index) => (
                      <div key={category._id} className="p-4 hover:bg-gray-50">
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {category.name}
                            </h3>
                          </div>
                          <div className="text-sm text-gray-600 mb-2">
                            <span className="font-medium">Slug:</span> {category.slug}
                          </div>
                          <div className="text-sm text-gray-600 mb-3">
                            <span className="font-medium">Description:</span> 
                            <div className="mt-1">{category.description || 'No description'}</div>
                          </div>
                          <div className="flex items-center justify-between mb-3">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                category.status === 'active' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {category.status}
                              </span>
                          </div>
                          
                          {isAdmin && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => openEditModal(category)}
                                className="bg-gradient-to-r from-[#336600] to-[#2a5200] hover:from-[#2a5200] hover:to-[#1e3d00] text-white px-3 py-2 rounded text-sm font-medium transition duration-200 flex items-center justify-center flex-1"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(category._id)}
                                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-3 py-2 rounded text-sm font-medium transition duration-200 flex items-center justify-center flex-1"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Add Category Modal */}
        <AddCategoryModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAddCategory={handleAddCategory}
        />

        {/* Edit Category Modal */}
        <EditCategoryModal 
          isOpen={isEditModalOpen}
          onClose={closeEditModal}
          onEditCategory={handleEditCategory}
          category={editingCategory}
        />
      </div>
    </div>
  );
};

export default Categories;