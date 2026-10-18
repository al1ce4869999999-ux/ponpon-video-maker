# v0.5 2Dリグ 検証・公開判定記録

更新日: 2026-10-18

## 証拠の区別
- **GitHubで直接確認:** ブランチ `feat/v05-2d-rig` は main より5コミット進んでいる。PR #7はDraft。リグ、描画、編集、モーション、ストレージ、3つのテストファイルが存在する。
- **旧作業環境からの引継ぎ報告（再検証待ち）:** 解析10件、データ21件、ブラウザ操作、旧作品復元、混在3カットMP4のデコード検証成功。
- **GitHub未反映:** 最終ローカルコミット `e0fbb10` とその修正・テスト・旧VALIDATION.md。GitHub検索ではコミットを確認できなかった。
- **未検証:** iPhone Safari実機の素材登録、タッチ座標、再生、MP4録画、共有/保存、容量上限とメモリ回復。キャラクター正式素材による視覚品質判定。

## GitHubに反映済みの機能のコード監査
- `rig.js`: 親子関係、座標/pivot/倍率/不透明度、循環検出、画像容量制限、旧作品の移行コード
- `renderer.js`: 親の変形を継承するCanvas描画と画像キャッシュ
- `motion-presets.js`: idle / blink / talk / nod / surprise / cry / tail_wag / stumble / fall_back、複合3種類
- `rig-editor.js`: モバイル向け選択・数値・ポインタ編集、透過画像登録と縮小
- `index.html`: 絵コンテ、プレビュー、作品保存、リグUI接続
これは**コードの存在確認**であり、全機能の正常動作や映像品質を保証しない。

## 今回実測した自動検証（2026-10-18）
- GitHub Actions run #39097826265 (`v0.5 Rig Checks`): **success**
- ジョブ `regression` 成功。構文チェックと `test_analyzer_v04.js`, `test_rig.js`, `test_renderer.js`, `test_motions.js`, `test_v05_regression.js` の実行ステップがすべて成功。
- 実行対象のGitHubコミット: `d2ed9c8e241704f165588110c2fca369d405a901`
- URL: https://github.com/al1ce4869999999-ux/ponpon-video-maker/actions/runs/39097826265
- これはNodeベースの検証であり、Safari実機・ブラウザUI・動画ファイルのデコード品質までを証明するものではない。

## モバイル幅ブラウザ実測（2026-10-18）
- GitHub Actions run #39103887903: **success** (`regression` job)
- 初期リグ作成、頭の回転数値編集、モーション再生・停止、文章解析から絵コンテ作成、リグ含むJSONの保存・復元、およびページエラーなしをChromiumの390x844ビューポートで確認。
- このテストはAndroid/iOS Safariのブラウザ実機ではない。動画書き出しやデコード、メモリ上限は対象外。
- 実行対象: `062f6249dc11e791ac2e68f824102f43da68934a`
- https://github.com/al1ce4869999999-ux/ponpon-video-maker/actions/runs/39103887903

## 動画ファイル生成・デコード実測（2026-10-18）
- GitHub Actions #39104144405: **success**
- Chromium画面からMP4録画・ダウンロード実行、約2.04MBの動画を取得。
- FFmpegコマンドによるファイルの全デコードを実行し終了コード0を確認。
- これは短い単一範囲の動画検証。この時点では混在3カットのMP4やiPhone Safariでの録画・共有は未確認（下記で混在3カットを後続検証）。
- URL: https://github.com/al1ce4869999999-ux/ponpon-video-maker/actions/runs/39104144405

## 混在3カットMP4デコード実測（2026-10-18）
- GitHub Actions #39104302579: **success**
- `test_v05_browser.py` でリグ / 従来画像 / リグの混在3カット、wipe / fadeカット切替を設定。
- ブラウザから `v05-mixed.mp4` (711,575 bytes) の出力とFFmpeg全デコード成功をログで確認。
- 同CIで単一区間MP4 (2,052,151 bytes) の生成・FFmpeg全デコードも成功。
- この試験のリグは未素材のテンプレート。正式ぽんぽん素材の視覚品質保証ではない。
- URL: https://github.com/al1ce4869999999-ux/ponpon-video-maker/actions/runs/39104302579

## 公開の必須条件
1. `e0fbb10` に相当する最終修正を回収するか、内容を特定して安全に再構築する。
2. 旧作品をバックアップから読み込み、改変・欠落なしの復元を確認。
3. 自動テストと画面操作・動画デコード検証を最新HEADで再実施し、ログを保存。
4. iPhone Safari実機で画像選択、編集、戻る操作、保存、書き出しを確認。
5. 正式なぽんぽん素材の頭・目・口・耳・腕・しっぽが自然に動き、親子追従し、分離しないことを映像で確認。
6. プロダクトオーナーの承認後にのみmainへマージ/Pagesへ公開。

## 安全ルール
Draft PR作成や作業ブランチへの文書追記は本番公開ではない。検証未完了のIssueを閉じない。原本画像・既存保存データを上書き/削除しない。検証結果を「以前の報告」と「今回の実測」で混同しない。


## WebKit互換性の追加検証（2026-10-18）
- CI run [#39104982390](https://github.com/al1ce4869999999-ux/ponpon-video-maker/actions/runs/39104982390): 成功。
- Linux上のPlaywright WebKit 26.0: リグ編集・うなずき再生・絵コンテ生成・JSON保存復元・ページエラーなしのテスト成功。
- 同runのChromium: 単体MP4 2,041,501 bytes、混在3カットMP4 716,031 bytes。ともにFFmpegデコード成功。
- **WebKit MediaRecorder: SKIP** (`MediaRecorder MIME unsupported`)。動画書き出し可能とは判定しない。
- iPhone Safari実機で同じWebKit機能が動く保証はない。実機でMediaRecorder / canvas.captureStream / MP4を別途判定する。
- フォールバックとして既存の静止画保存が残るが、静止画だけで動画書き出しの成功とはしない。

## 素材と旧コミットの確認（2026-10-18）
- GitHubに存在するブランチ: main / feat/v05-2d-rig / feat/ponpon-four-panel-mvp。
- `e0fbb10` はGitHubコミット検索で発見できず、内容の一致は証明できない。
- 利用可能なLibraryに「拾われ待ちのたぬき、ぽんぽん.png」漫画作品画像は存在するが、独立した身体パーツ群であることは確認できず、正式なリグ品質受入には使用できない。
- 検証手順と合否条件は [ACCEPTANCE_V05.md](ACCEPTANCE_V05.md) に固定した。

## PNG素材登録・ポインタ移動の追加検証（2026-10-18）
- [GitHub Actions #39105385282](https://github.com/al1ce4869999999-ux/ponpon-video-maker/actions/runs/39105385282): **success**。
- 正常なPNGテスト画像を生成してリグのheadパーツへ登録し、画像データがstateに保存されたことを確認。
- キャンバスを表示範囲へスクロールし、ポインタドラッグでheadの位置が変わることを確認。
- Chromium/WebKitの両方で、リグ編集、画像登録、ポインタ、JSON復元のテストが成功。
- Chromiumでは単体MP4（2,066,507 bytes）と混在3カットMP4（692,724 bytes）のFFmpegデコード成功。
- WebKitではMediaRecorder MIME非対応のため録画はスキップ。
- これはテスト用1px画像による機能検証で、正式ぽんぽん素材の外観品質や、iPhone実機の指タッチ/Files選択を保証しない。
