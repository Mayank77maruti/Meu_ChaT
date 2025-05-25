import React from 'react';

interface LinkPreviewProps {
  preview: {
    url: string;
    title: string;
    description?: string;
    image?: string;
    siteName?: string;
  };
}

export const LinkPreview: React.FC<LinkPreviewProps> = ({ preview }) => {
  const handleClick = () => {
    window.open(preview.url, '_blank');
  };

  return (
    <div 
      onClick={handleClick} 
      className="max-w-[400px] mt-2 border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    >
      {preview.image && (
        <img 
          src={preview.image} 
          alt={preview.title} 
          className="w-full h-[200px] object-cover"
        />
      )}
      <div className="p-3">
        <h4 className="text-base font-medium text-gray-900 mb-2">{preview.title}</h4>
        {preview.description && (
          <p className="text-sm text-gray-600 mb-2 leading-relaxed">{preview.description}</p>
        )}
        <span className="text-xs text-gray-500">{preview.siteName}</span>
      </div>
    </div>
  );
}; 