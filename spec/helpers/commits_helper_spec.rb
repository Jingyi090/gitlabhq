# frozen_string_literal: true

require 'spec_helper'

RSpec.describe CommitsHelper do
  include ProjectForksHelper

  describe '#revert_commit_link' do
    context 'when current_user exists' do
      before do
        allow(helper).to receive(:current_user).and_return(double('User'))
      end

      it 'renders a div for Vue' do
        result = helper.revert_commit_link

        expect(result).to include('js-revert-commit-trigger')
      end
    end

    context 'when current_user does not exist' do
      before do
        allow(helper).to receive(:current_user).and_return(nil)
      end

      it 'does not render anything' do
        result = helper.revert_commit_link

        expect(result).to be_nil
      end
    end
  end

  describe '#cherry_pick_commit_link' do
    context 'when current_user exists' do
      before do
        allow(helper).to receive(:current_user).and_return(double('User'))
      end

      it 'renders a div for Vue' do
        result = helper.cherry_pick_commit_link

        expect(result).to include('js-cherry-pick-commit-trigger')
      end
    end

    context 'when current_user does not exist' do
      before do
        allow(helper).to receive(:current_user).and_return(nil)
      end

      it 'does not render anything' do
        result = helper.cherry_pick_commit_link

        expect(result).to be_nil
      end
    end
  end

  describe 'commit_author_link' do
    it 'escapes the author email' do
      commit = double(
        author: nil,
        author_name: 'Persistent XSS',
        author_email: 'my@email.com" onmouseover="alert(1)'
      )

      expect(helper.commit_author_link(commit))
        .not_to include('onmouseover="alert(1)"')
    end

    it 'escapes the author name' do
      user = build_stubbed(:user, name: 'Foo <script>alert("XSS")</script>')

      commit = double(author: user, author_name: '', author_email: '')

      expect(helper.commit_author_link(commit))
        .to include('Foo &lt;script&gt;')
      expect(helper.commit_author_link(commit, avatar: true))
        .to include('commit-author-name', 'js-user-link', 'Foo &lt;script&gt;')
    end
  end

  describe 'commit_committer_link' do
    it 'escapes the committer email' do
      commit = double(
        committer: nil,
        committer_name: 'Persistent XSS',
        committer_email: 'my@email.com" onmouseover="alert(1)'
      )

      expect(helper.commit_committer_link(commit))
        .not_to include('onmouseover="alert(1)"')
    end

    it 'escapes the committer name' do
      user = build_stubbed(:user, name: 'Foo <script>alert("XSS")</script>')

      commit = double(committer: user, committer_name: '', committer_email: '')

      expect(helper.commit_committer_link(commit))
        .to include('Foo &lt;script&gt;')
      expect(helper.commit_committer_link(commit, avatar: true))
        .to include('commit-committer-name', 'Foo &lt;script&gt;')
    end
  end

  describe '#view_file_button' do
    let(:project) { build(:project) }
    let(:path) { 'path/to/file' }
    let(:sha) { '1234567890' }

    subject do
      helper.view_file_button(sha, path, project)
    end

    it 'links to project files' do
      expect(subject).to have_link('1234567', href: helper.project_blob_path(project, "#{sha}/#{path}"))
    end
  end

  describe '#view_on_environment_button' do
    let(:project) { create(:project) }
    let(:environment) { create(:environment, external_url: 'http://example.com') }
    let(:path) { 'source/file.html' }
    let(:sha) { RepoHelpers.sample_commit.id }

    before do
      allow(environment).to receive(:external_url_for).with(path, sha).and_return('http://example.com/file.html')
    end

    it 'returns a link tag linking to the file in the environment' do
      html = helper.view_on_environment_button(sha, path, environment)
      node = Nokogiri::HTML.parse(html).at_css('a')

      expect(node[:title]).to eq('View on example.com')
      expect(node[:href]).to eq('http://example.com/file.html')
    end
  end

  describe '#commit_to_html' do
    let(:project) { create(:project, :repository) }
    let(:ref) { 'master' }
    let(:commit) { project.commit(ref) }

    it 'renders HTML representation of a commit' do
      assign(:project, project)
      allow(helper).to receive(:current_user).and_return(project.owner)

      expect(helper.commit_to_html(commit, ref, project)).to include('<div class="commit-content')
    end
  end

  describe 'commit_path' do
    it 'returns a persisted merge request commit path' do
      project = create(:project, :repository)
      persisted_merge_request = create(:merge_request, source_project: project, target_project: project)
      commit = project.repository.commit

      expect(helper.commit_path(persisted_merge_request.project, commit, merge_request: persisted_merge_request))
        .to eq(diffs_project_merge_request_path(project, persisted_merge_request, commit_id: commit.id))
    end

    it 'returns a non-persisted merge request commit path which commits still reside in the source project' do
      source_project = create(:project, :repository)
      target_project = create(:project, :repository)
      non_persisted_merge_request = build(:merge_request, source_project: source_project, target_project: target_project)
      commit = source_project.repository.commit

      expect(helper.commit_path(non_persisted_merge_request.project, commit, merge_request: non_persisted_merge_request))
        .to eq(project_commit_path(source_project, commit))
    end

    it 'returns a project commit path' do
      project = create(:project, :repository)
      commit = project.repository.commit

      expect(helper.commit_path(project, commit)).to eq(project_commit_path(project, commit))
    end
  end

  describe "#conditionally_paginate_diff_files" do
    let(:diffs_collection) { instance_double(Gitlab::Diff::FileCollection::Commit, diff_files: diff_files) }
    let(:diff_files) { Gitlab::Git::DiffCollection.new(files) }
    let(:page) { nil }

    let(:files) do
      Array.new(85).map do
        { too_large: false, diff: "" }
      end
    end

    let(:params) do
      {
        page: page
      }
    end

    subject { helper.conditionally_paginate_diff_files(diffs_collection, paginate: paginate) }

    before do
      allow(helper).to receive(:params).and_return(params)
    end

    context "pagination is enabled" do
      let(:paginate) { true }

      it "has been paginated" do
        expect(subject).to be_an(Array)
      end

      it "can change the number of items per page" do
        commits = helper.conditionally_paginate_diff_files(diffs_collection, paginate: paginate, per: 10)

        expect(commits).to be_an(Array)
        expect(commits.size).to eq(10)
      end

      context "page 1" do
        let(:page) { 1 }

        it "has 20 diffs" do
          expect(subject.size).to eq(75)
        end
      end

      context "page 2" do
        let(:page) { 2 }

        it "has the remaining 10 diffs" do
          expect(subject.size).to eq(10)
        end
      end
    end

    context "pagination is disabled" do
      let(:paginate) { false }

      it "returns a standard DiffCollection" do
        expect(subject).to be_a(Gitlab::Git::DiffCollection)
      end
    end
  end

  describe '#cherry_pick_projects_data' do
    let(:project) { create(:project, :repository) }
    let(:user) { create(:user, maintainer_projects: [project]) }
    let!(:forked_project) { fork_project(project, user, { namespace: user.namespace, repository: true }) }

    before do
      allow(helper).to receive(:current_user).and_return(user)
    end

    it 'returns data for cherry picking into a project' do
      expect(helper.cherry_pick_projects_data(project)).to match_array([
        { id: project.id.to_s, name: project.full_path, refsUrl: refs_project_path(project) },
        { id: forked_project.id.to_s, name: forked_project.full_path, refsUrl: refs_project_path(forked_project) }
      ])
    end
  end
end
