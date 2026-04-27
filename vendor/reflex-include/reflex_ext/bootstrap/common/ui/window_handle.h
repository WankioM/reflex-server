#pragma once

#include "../[require].h"




//
//Secondary API

namespace Reflex::Bootstrap
{

	class WindowHandle;


	REFLEX_DECLARE_KEY32(dialog);

	TRef <WindowHandle> ShowDialogWindow(GLX::Object & owner, const WString::View & title, TRef <GLX::Object> content, Key32 id = kdialog);

	void CloseDialogWindow(GLX::Object & owner, Key32 id = kdialog);

	WindowHandle * QueryDialogWindow(GLX::Object & owner, Key32 id = kdialog);

}




//
//WindowHandle

class Reflex::Bootstrap::WindowHandle : public Object
{
public:

	REFLEX_OBJECT(Bootstrap::WindowHandle, Object);

	
	
	//lifetime
	
	WindowHandle(const WString::View & title, bool top_most, TRef <GLX::Object> content, const Function <void()> & on_close_request = {});


	
	//config
	
	void EnableLayoutPersistence(File::PersistentPropertySet & prefs, ArrayView <Key32> id);


	
	//access
	
	TRef <GLX::Object> GetContent() { return m_content; }


	void Show(GLX::Alignment position = GLX::kAlignmentCenter, bool allow_animations = false);

	void Hide();

	void Close() { GLX::EmitCloseRequest(m_content); }



protected:

	struct LayoutPersistence;

	static UInt8 MakeStyleFlags(bool closeable) { return System::kWindowStyleFrame | System::kWindowStyleResizable | (closeable ? 0 : System::kWindowStyleCloseable); }


	Reference <System::Window> m_window;

	TRef <GLX::WindowClient> m_window_client;

	TRef <GLX::Object> m_content;

	
	Reference <Object> m_clock, m_persistence;

	bool m_initialized;

};
