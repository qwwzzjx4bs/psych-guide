!macro NSIS_HOOK_POSTINSTALL
  MessageBox MB_OK|MB_ICONINFORMATION \
    "インストールが完了しました。$\r$\n$\r$\n\
     デスクトップの「指定医レポート作成」から起動できます。$\r$\n$\r$\n\
     初回起動時に「Windows によって PC が保護されました」と表示された場合は、$\r$\n\
     「詳細情報」→「実行」を選んでください。$\r$\n$\r$\n\
     詳しい手順は ZIP に同梱の「インストールのしかた.txt」をご覧ください。"
!macroend
