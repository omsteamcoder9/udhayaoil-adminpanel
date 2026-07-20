// src/components/EditCategoryModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon, Trash2 } from 'lucide-react';

const EditCategoryModal = ({ isOpen, onClose, onEditCategory, category }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active'
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [existingImage, setExistingImage] = useState(null);
  const [deleteImage, setDeleteImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const imageBaseUrl = import.meta.env.VITE_API_IMG_URL || 'http://localhost:5002/uploads';

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        description: category.description || '',
        status: category.status || 'active'
      });
      
      if (category.image) {
        setExistingImage(category.image);
        // Remove /uploads/ from path since VITE_API_IMG_URL already has /uploads
        const cleanImagePath = category.image.replace('/uploads/', '');
        setImagePreview(`${imageBaseUrl}/${cleanImagePath}`);
      } else {
        setExistingImage(null);
        setImagePreview(null);
      }
      
      setImageFile(null);
      setDeleteImage(false);
    }
  }, [category, imageBaseUrl]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const preview = URL.createObjectURL(file);
      setImagePreview(preview);
      setDeleteImage(false);
    }
  };

  const removeImage = () => {
    if (imagePreview && !existingImage) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview(null);
    setExistingImage(null);
    setDeleteImage(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (!formData.name || !formData.description) {
      setError('Please fill all required fields');
      setLoading(false);
      return;
    }

    try {
      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('description', formData.description);
      submitData.append('status', formData.status);
      
      if (deleteImage) {
        submitData.append('deleteImage', 'true');
      } else if (imageFile) {
        submitData.append('image', imageFile);
      }
      
      await onEditCategory(category._id, submitData);
      onClose();
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to update category');
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-3 border-b">
          <h2 className="text-lg font-semibold text-gray-800">Edit Category</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-[#336600] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Category Image
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 hover:border-[#336600] transition-colors">
              {imagePreview ? (
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-20 w-20 object-cover rounded-lg"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/80?text=No+Image';
                    }}
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center cursor-pointer">
                  <ImageIcon size={28} className="text-gray-400" />
                  <span className="text-xs text-[#336600] mt-1">Upload Image</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                  <p className="text-[10px] text-gray-400 mt-1">PNG, JPG up to 2MB</p>
                </label>
              )}
            </div>
            {existingImage && !deleteImage && !imageFile && (
              <p className="text-xs text-green-600 mt-1">✓ Current image will be kept</p>
            )}
            {deleteImage && (
              <p className="text-xs text-red-600 mt-1">✗ Image will be deleted</p>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#336600] focus:border-transparent text-sm"
              placeholder="Enter category name"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows="2"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#336600] focus:border-transparent text-sm resize-none"
              placeholder="Enter category description"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#336600] focus:border-transparent text-sm"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-[#336600] rounded-lg hover:bg-[#2a5200] disabled:opacity-50 transition-colors"
            >
              {loading ? 'Updating...' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCategoryModal;