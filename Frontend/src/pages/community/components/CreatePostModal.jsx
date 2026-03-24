import React, { useRef, useState } from 'react';
import { createPost } from '../../../services/communityService';
import { useAuth } from '../../../context/AuthContext';
import '../../CommunityBoard.css';

const postTypes = [
  { value: 'lost-item', label: '🔍 Lost Item' },
  { value: 'found-item', label: '✅ Found Item' },
  { value: 'announcement', label: '📢 Announcement' },
  { value: 'event', label: '🎉 Event' },
  { value: 'help-request', label: '🆘 Help Request' },
  { value: 'idea-tip', label: '💡 Idea / Tip' }
];

const CreatePostModal = ({ onClose, onPostCreated }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'lost-item',
    category: '',
    tags: '',
    location: '',
    contactInfo: ''
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageSelection = (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    setError('');
    setSelectedImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    handleImageSelection(file);
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    setPreviewUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim()) {
      setError('Title and description are required');
      return;
    }

    if (!user || !user._id) {
      setError('You must be logged in to create a post');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const postPayload = new FormData();
      postPayload.append('title', formData.title);
      postPayload.append('description', formData.description);
      postPayload.append('type', formData.type);
      postPayload.append('category', formData.category);
      postPayload.append('location', formData.location);
      postPayload.append('contactInfo', formData.contactInfo);
      postPayload.append(
        'tags',
        JSON.stringify(
          formData.tags
            ? formData.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
            : []
        )
      );
      postPayload.append('userId', user._id);
      postPayload.append('userName', user.name);
      postPayload.append('userEmail', user.email);

      if (selectedImage) {
        postPayload.append('image', selectedImage);
      }

      await createPost(postPayload);
      onPostCreated();
    } catch (err) {
      setError(err.message || 'Failed to create post');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content create-post-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        
        <h2>Create New Post</h2>
        
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="create-post-form">
          {/* Post Type */}
          <div className="form-group">
            <label>Post Type *</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="form-control"
            >
              {postTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Blue Water Bottle Lost"
              className="form-control"
              maxLength="200"
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label>Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Provide details..."
              className="form-control"
              rows="4"
            />
          </div>

          {/* Location */}
          <div className="form-group">
            <label>Location</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g., Library, Engineering Building"
              className="form-control"
            />
          </div>

          {/* Contact Info */}
          <div className="form-group">
            <label>Contact Info</label>
            <input
              type="text"
              name="contactInfo"
              value={formData.contactInfo}
              onChange={handleChange}
              placeholder="Phone or email"
              className="form-control"
            />
          </div>

          {/* Tags */}
          <div className="form-group">
            <label>Tags (comma-separated)</label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              placeholder="e.g., blue, bottle, water"
              className="form-control"
            />
          </div>

          {/* Category */}
          <div className="form-group">
            <label>Category</label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleChange}
              placeholder="e.g., Personal Items, Campus"
              className="form-control"
            />
          </div>

          {/* Image Upload */}
          <div className="form-group">
            <label>Image Upload (Optional)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="file-input-hidden"
              onChange={(event) => handleImageSelection(event.target.files?.[0])}
            />
            <div
              className={`image-dropzone ${isDragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <p>Drag and drop an image here, or click to browse</p>
              <small>PNG, JPG, GIF, WEBP up to 5MB</small>
            </div>

            {previewUrl && (
              <div className="image-preview-wrap">
                <img src={previewUrl} alt="Preview" className="image-preview" />
                <button
                  type="button"
                  className="btn-cancel image-remove-btn"
                  onClick={removeSelectedImage}
                >
                  Remove image
                </button>
              </div>
            )}

            {!previewUrl && (
            <input
              type="text"
              value="No image selected"
              readOnly
              className="form-control"
            />
            )}
          </div>

          {/* Buttons */}
          <div className="form-actions">
            <button 
              type="button" 
              className="btn-cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePostModal;
