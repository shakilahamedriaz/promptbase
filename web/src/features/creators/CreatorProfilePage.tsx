import { useParams } from 'react-router-dom';
import { useCreator } from '@/hooks/useCreator';
import { formatDistanceToNow } from 'date-fns';
import { StarIcon, UserIcon } from '@heroicons/react/24/solid';
import { PromptCard } from '../marketplace/PromptCard';

export function CreatorProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { profile, prompts, isLoading, toggleFollow } = useCreator(userId || null);

  if (!userId) {
    return <div className="p-8 text-center text-red-600">Creator not found</div>;
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="space-y-4 animate-pulse">
          <div className="h-32 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg" />
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return <div className="p-8 text-center text-gray-600">Creator not found</div>;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.display_name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-12 h-12 text-white" />
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{profile.display_name}</h1>
                <button
                  onClick={() => toggleFollow()}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    profile.is_following
                      ? 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {profile.is_following ? 'Following' : 'Follow'}
                </button>
              </div>

              {profile.bio && <p className="text-gray-700 mb-4">{profile.bio}</p>}

              <p className="text-sm text-gray-500">
                Joined {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-8">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-gray-900">{profile.total_prompts}</div>
              <div className="text-sm text-gray-600">Prompts</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-1">
                <span className="text-2xl font-bold text-gray-900">{profile.avg_quality_score.toFixed(1)}</span>
                <span className="text-xs text-gray-500">/100</span>
              </div>
              <div className="text-sm text-gray-600">Avg Quality</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-gray-900">{profile.total_ratings}</div>
              <div className="text-sm text-gray-600">Ratings</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-gray-900">{profile.follower_count}</div>
              <div className="text-sm text-gray-600">Followers</div>
            </div>
          </div>
        </div>
      </div>

      {/* Prompts */}
      <div className="max-w-4xl mx-auto px-8 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Published Prompts</h2>
        {prompts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No published prompts yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {prompts.map(prompt => (
              <PromptCard
                key={prompt.id}
                prompt={prompt}
                onImport={() => {}}
                onTogglePublish={() => {}}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
